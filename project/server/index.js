import express from 'express';
import cors from 'cors';
import multer from 'multer';

// --- Import ALL Your Route Files ---
import boqRoutes from './routes/boqRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import laborRoutes from './routes/laborRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import workforceRoutes from './routes/workforceRoutes.js';
import housePlanRoutes from './routes/housePlanRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import diaryRoutes from './routes/diaryRoutes.js';
import financialRoutes from './routes/financialRoutes.js'; // <-- 1. IMPORT

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- API Routes ---
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/labour', laborRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/house-plans', housePlanRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/financials', financialRoutes); // <-- 2. CONNECT

app.use('/api/boq', upload.single('boqFile'), boqRoutes);

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 Construction Pro Estimator backend is live on http://localhost:${PORT}`);
});