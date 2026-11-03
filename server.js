require('dotenv').config();
const express=require('express'),mongoose=require('mongoose'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),path=require('path');
const app=express();app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
const SECRET=process.env.JWT_SECRET||'dev-secret';
const {ObjectId}=mongoose.Schema.Types;

// --- MODELS ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, lowercase: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'viewer'], default: 'viewer' }
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, required: true },
  description: { type: String },
  unit: { type: String, default: 'units' },
  target: { type: Number, required: true, min: 1 },
  current: { type: Number, default: 0, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  owner: { type: ObjectId, ref: 'User', required: true },
  ownerName: { type: String },
  history: [{
    by: String,
    from: Number,
    to: Number,
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);

const CATS=['Tree Plantation','Water Conservation','Waste Management','Renewable Energy','Biodiversity'];
const STATUS=['Planned','Active','On Hold','Completed'];
// Helper for errors
const fail = (code, msg) => {
  const err = new Error(msg);
  err.code = code;
  return err;
};

const ah=fn=>(req,res,next)=>fn(req,res,next).catch(next);
const sign=u=>jwt.sign({id:u._id,role:u.role,name:u.name},SECRET,{expiresIn:'8h'});

const auth = ah(async (req, res, next) => {
  let token = req.headers.authorization || '';
  if (token.startsWith('Bearer ')) token = token.slice(7);
  
  if (!token) throw fail(401, 'Authentication required');
  
  try {
    const payload = jwt.verify(token, SECRET);
    const u = await User.findById(payload.id);
    if (!u) throw fail(401, 'Account no longer exists');
    req.user = { id: String(u._id), role: u.role, name: u.name };
    next();
  } catch (err) {
    throw fail(401, 'Invalid or expired session');
  }
});

const adminOnly = (req, res, next) => 
  req.user.role === 'admin' ? next() : next(fail(403, 'Administrator access required'));

const canWrite = (req, res, next) => 
  ['admin', 'manager'].includes(req.user.role) ? next() : next(fail(403, 'Viewers have read-only access'));

// Validates + normalises input. Business rule: current can never exceed target or be negative.
function clean(b){
  const e=[],d={};
  d.name=String(b.name||'').trim();if(d.name.length<3)e.push('Name must be at least 3 characters');
  d.location=String(b.location||'').trim();if(!d.location)e.push('Location is required');
  d.category=b.category;if(!CATS.includes(d.category))e.push('Invalid category');
  d.status=b.status;if(!STATUS.includes(d.status))e.push('Invalid status');
  d.unit=String(b.unit||'units').trim();d.description=String(b.description||'').trim();
  d.target=Number(b.target);d.current=Number(b.current??0);
  if(!Number.isFinite(d.target)||d.target<=0)e.push('Target must be a number greater than 0');
  if(!Number.isFinite(d.current)||d.current<0)e.push('Progress cannot be negative');
  else if(d.target>0&&d.current>d.target)e.push(`Progress (${d.current}) cannot exceed target (${d.target}). Raise the target first.`);
  d.startDate=b.startDate?new Date(b.startDate):undefined;d.endDate=b.endDate?new Date(b.endDate):undefined;
  if(d.startDate&&d.endDate&&d.endDate<d.startDate)e.push('End date must be after start date');
  if(e.length)throw fail(400,e.join('. '));
  return d;
}

app.post('/api/auth/register',ah(async(req,res)=>{
  const {name,email,password}=req.body;
  if(!name||!/^\S+@\S+\.\S+$/.test(email||'')||(password||'').length<6)throw fail(400,'Valid name, email and a password of 6+ characters required');
  if(await User.findOne({email}))throw fail(409,'Email already registered');
  const u=await User.create({name,email,password:await bcrypt.hash(password,10),role:'manager'});
  res.status(201).json({token:sign(u),user:{id:u._id,name:u.name,email:u.email,role:u.role}});
}));
app.post('/api/auth/login',ah(async(req,res)=>{
  const u=await User.findOne({email:String(req.body.email||'').toLowerCase()});
  if(!u||!(await bcrypt.compare(req.body.password||'',u.password)))throw fail(401,'Invalid email or password');
  res.json({token:sign(u),user:{id:u._id,name:u.name,email:u.email,role:u.role}});
}));

app.get('/api/db-status', (req, res) => res.json({ status: dbStatus }));
app.get('/api/health', async (req, res) => {
  const status = {
    ok: true,
    db: dbStatus,
    users: 0,
    projects: 0
  };
  if (dbStatus === 'Connected') {
    try {
      status.users = await User.countDocuments();
      status.projects = await Project.countDocuments();
    } catch (e) {}
  }
  res.json(status);
});
app.get('/api/users',auth,adminOnly,ah(async(req,res)=>res.json(await User.find().select('-password').sort('name'))));
app.put('/api/users/:id/role',auth,adminOnly,ah(async(req,res)=>{
  if(!['admin','manager','viewer'].includes(req.body.role))throw fail(400,'Invalid role');
  if(req.params.id===req.user.id)throw fail(400,'You cannot change your own role');
  const u=await User.findByIdAndUpdate(req.params.id,{role:req.body.role},{new:true}).select('-password');
  if(!u)throw fail(404,'User not found');res.json(u)}));
app.delete('/api/users/:id',auth,adminOnly,ah(async(req,res)=>{
  if(req.params.id===req.user.id)throw fail(400,'You cannot remove yourself');
  if(!(await User.findByIdAndDelete(req.params.id)))throw fail(404,'User not found');res.json({ok:true})}));
app.get('/api/projects',auth,ah(async(req,res)=>{
  const q={};if(req.query.status)q.status=req.query.status;if(req.query.category)q.category=req.query.category;
  if(req.query.search)q.name={$regex:req.query.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
  res.json(await Project.find(q).sort('-updatedAt'));
}));
app.post('/api/projects',auth,canWrite,ah(async(req,res)=>{
  const p=await Project.create({...clean(req.body),owner:req.user.id,ownerName:req.user.name,history:[]});
  res.status(201).json(p);
}));
app.put('/api/projects/:id',auth,canWrite,ah(async(req,res)=>{
  const p=await Project.findById(req.params.id);if(!p)throw fail(404,'Project not found');
  if(req.user.role!=='admin'&&String(p.owner)!==req.user.id)throw fail(403,'You can only edit your own projects');
  const d=clean(req.body);
  if(d.current!==p.current)p.history.push({by:req.user.name,from:p.current,to:d.current}); // audit trail
  Object.assign(p,d);await p.save();res.json(p);
}));
app.delete('/api/projects/:id',auth,canWrite,ah(async(req,res)=>{
  const p=await Project.findById(req.params.id);if(!p)throw fail(404,'Project not found');
  if(req.user.role!=='admin'&&String(p.owner)!==req.user.id)throw fail(403,'You can only delete your own projects');
  await p.deleteOne();res.json({ok:true});
}));

// Stats are computed from live data on every request, so nothing is ever stale.
app.get('/api/stats',auth,ah(async(req,res)=>{
  const ps=await Project.find();
  const pct=p=>p.target?Math.min(100,Math.round(p.current/p.target*100)):0;
  
  // Grouping using MongoDB aggregation or reduce
  const group=k=>Object.values(ps.reduce((a,p)=>{
    const g=a[p[k]]??={name:p[k],count:0,target:0,current:0};
    g.count++;
    g.target+=p.target;
    g.current+=p.current;
    return a;
  },{}));

  const byCategory = CATS.map(cat => {
    const matching = ps.filter(p => p.category === cat);
    const totalTarget = matching.reduce((s, p) => s + p.target, 0);
    const totalCurrent = matching.reduce((s, p) => s + p.current, 0);
    return {
      name: cat,
      count: matching.length,
      progress: totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0
    };
  });

  const recent=ps.flatMap(p=>p.history.map(h=>({
    project:p.name,
    unit:p.unit,
    ...h.toObject()
  }))).sort((a,b)=>b.at-a.at).slice(0,6);

  res.json({
    db:dbStatus,
    total:ps.length,
    completed:ps.filter(p=>p.status==='Completed').length,
    active:ps.filter(p=>p.status==='Active' || p.status==='Planned').length,
    avgProgress:ps.length?Math.round(ps.reduce((s,p)=>s+pct(p),0)/ps.length):0,
    byStatus:group('status').map(g=>({name:g.name,count:g.count})),
    byCategory,
    byLocation:group('location').map(g=>({name:g.name,count:g.count})),
    recent
  });
}));

app.use('/api',(req,res,next)=>next(fail(404,'Not found')));
app.use((err,req,res,next)=>{const code=err.name==='CastError'?400:err.code>=400&&err.code<600?err.code:500;
  if(code===500)console.error(err);res.status(code).json({error:code===500?'Server error':err.message})});

async function seed(){
  if(await User.countDocuments())return;
  const h=await bcrypt.hash('Password@123',10);
  const [a,m]=await User.create([{name:'Admin',email:'admin@akshayavana.com',password:h,role:'admin'},
    {name:'Meera Manager',email:'manager@akshayavana.com',password:h,role:'manager'},
    {name:'Vikram Viewer',email:'viewer@akshayavana.com',password:h,role:'viewer'}]);
  const mk=(o,n,l,c,s,u,t,cur,by)=>({name:n,location:l,category:c,status:s,unit:u,target:t,current:cur,owner:o._id,ownerName:o.name,description:`${n} initiative in ${l}.`,startDate:new Date('2026-01-15'),endDate:new Date('2026-12-31'),history:[]});
  await Project.create([
    mk(a,'Western Ghats Reforestation','Coorg, Karnataka','Tree Plantation','Active','trees',1000,600),
    mk(a,'Urban Miyawaki Forest','Bengaluru, Karnataka','Tree Plantation','Active','trees',5000,3200),
    mk(m,'Lake Rejuvenation Drive','Hosur, Tamil Nadu','Water Conservation','Active','lakes',4,1),
    mk(m,'Village Solar Microgrid','Anantapur, Andhra Pradesh','Renewable Energy','Planned','kW',250,0),
    mk(m,'Zero-Waste Campus','Mysuru, Karnataka','Waste Management','Completed','tonnes',80,80),
    mk(a,'Pollinator Corridor','Wayanad, Kerala','Biodiversity','On Hold','hectares',60,18)]);
  console.log('Seeded demo data');
}
let dbStatus = 'Connecting...';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
  dbStatus = 'Disconnected: Missing URI';
} else {
  mongoose.connect(MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000 
  })
    .then(async () => {
      console.log('MongoDB Atlas connected successfully');
      dbStatus = 'Connected';
      if (process.argv.includes('--reseed')) {
        await User.deleteMany();
        await Project.deleteMany();
        console.log('Database cleared');
      }
      await seed();
    })
    .catch(async (e) => {
      console.error('MongoDB Atlas connection failed:', e.message);
      dbStatus = 'Disconnected: ' + e.message;
      
      if (e.message.includes('authentication failed')) {
        console.error('Tip: Check your database username and password in .env');
      } else if (e.message.includes('whitelist')) {
        console.error('Tip: Ensure your current IP is whitelisted in MongoDB Atlas Network Access');
      }
    });
}

app.listen(process.env.PORT||5000,()=>console.log('Running on port',process.env.PORT||5000));