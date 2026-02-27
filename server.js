const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Ensure uploads directory exists
fs.ensureDirSync(path.join(__dirname, 'uploads'));

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Images only!'));
  }
});

// In-memory storage for patterns (use database in production)
let patterns = [];

// API Routes

// Get all patterns
app.get('/api/patterns', (req, res) => {
  res.json(patterns);
});

// Get single pattern
app.get('/api/patterns/:id', (req, res) => {
  const pattern = patterns.find(p => p.id === req.params.id);
  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }
  res.json(pattern);
});

// Create new pattern
app.post('/api/patterns', (req, res) => {
  const pattern = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  patterns.push(pattern);
  res.status(201).json(pattern);
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// Delete pattern
app.delete('/api/patterns/:id', (req, res) => {
  const index = patterns.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pattern not found' });
  }

  // Delete associated image if exists
  const pattern = patterns[index];
  if (pattern.imageFilename) {
    const imagePath = path.join(__dirname, 'uploads', pattern.imageFilename);
    fs.removeSync(imagePath);
  }

  patterns.splice(index, 1);
  res.json({ message: 'Pattern deleted' });
});

// Generate cutting plan (algorithm endpoint)
app.post('/api/generate', (req, res) => {
  const { category, subcategory, measurements, fabric } = req.body;

  // Algorithm logic for pattern generation
  const cuttingPlan = generateCuttingPlan(category, subcategory, measurements, fabric);

  res.json(cuttingPlan);
});

// Pattern generation algorithm
function generateCuttingPlan(category, subcategory, measurements, fabric) {
  const ease = 2; // Standard ease in cm
  const pieces = [];

  const categories = {
    robe: {
      pieces: ['devant', 'dos', 'manche', 'doublure'],
      measurements: ['poitrine', 'taille', 'hanches', 'longueur']
    },
    haut: {
      pieces: ['devant', 'dos', 'manche', 'col'],
      measurements: ['poitrine', 'taille', 'longueur']
    },
    pantalon: {
      pieces: ['devant', 'dos', 'ceinture'],
      measurements: ['tour_taille', 'tour_hanches', 'longueur_jambe']
    },
    jupe: {
      pieces: ['devant', 'dos', 'ceinture'],
      measurements: ['tour_taille', 'tour_hanches', 'longueur_jupe']
    }
  };

  const catData = categories[category] || categories.robe;

  catData.pieces.forEach((pieceName, index) => {
    const piece = calculatePieceDimensions(pieceName, measurements, ease);
    pieces.push({
      id: `piece-${index}`,
      name: pieceName,
      width: piece.width,
      height: piece.height,
      quantity: pieceName === 'manche' ? 2 : 1,
      instructions: generateInstructions(pieceName, fabric),
      svg: generateSVGPath(pieceName, piece.width, piece.height)
    });
  });

  return {
    pieces,
    fabricRequirements: calculateFabric(pieces),
    sewingOrder: generateSewingOrder(category),
    tips: generateFabricTips(fabric)
  };
}

function calculatePieceDimensions(pieceName, measurements, ease) {
  const m = measurements;
  switch(pieceName) {
    case 'devant':
      return {
        width: (m.poitrine || m.tour_taille || 100) / 4 + ease,
        height: m.longueur || m.longueur_haut || 60
      };
    case 'dos':
      return {
        width: (m.poitrine || m.tour_taille || 100) / 4 + ease,
        height: m.longueur || m.longueur_haut || 60
      };
    case 'manche':
      return {
        width: (m.tour_poignet || 20) + 4,
        height: m.longueur_manche || 60
      };
    case 'ceinture':
      return {
        width: (m.tour_taille || 70) + 4,
        height: 8
      };
    default:
      return { width: 30, height: 40 };
  }
}

function generateInstructions(pieceName, fabric) {
  const tips = {
    coton: 'Prévoir un peu de retrait au lavage',
    soie: 'Utiliser une aiguille fine (70/10)',
    jersey: 'Utiliser un point zigzag ou surjeteuse',
    jean: 'Aiguille jeans (100/16) requise',
    laine: 'Surfiler les bords',
    lin: 'Repasser à chaud avant couture',
    velours: 'Couper dans le sens du poil'
  };

  return [
    `Couper ${pieceName === 'manche' ? '2 fois' : '1 fois'} dans le tissu`,
    'Ajouter 1cm de couture sur les côtés',
    'Ourlet bas : 2cm',
    tips[fabric] || ''
  ].filter(Boolean);
}

function generateSVGPath(pieceName, width, height) {
  // Simplified SVG path generation
  switch(pieceName) {
    case 'devant':
      return `M 0,20 Q ${width/4},0 ${width/2},0 Q ${3*width/4},0 ${width},20 L ${width},${height} L 0,${height} Z`;
    case 'dos':
      return `M 0,10 L ${width},10 L ${width},${height} L 0,${height} Z`;
    case 'manche':
      return `M ${width/2},0 Q 0,${height/4} 0,${height/2} L 0,${height} L ${width},${height} L ${width},${height/2} Q ${width},${height/4} ${width/2},0 Z`;
    default:
      return `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`;
  }
}

function calculateFabric(pieces) {
  const totalArea = pieces.reduce((sum, p) => sum + (p.width * p.height * p.quantity), 0);
  const width = 140; // Standard fabric width in cm
  const length = Math.ceil(totalArea / width / 100) * 100; // Round to nearest meter
  return { width, length: Math.max(length, 100), unit: 'cm' };
}

function generateSewingOrder(category) {
  return [
    'Assembler les pinces et darts',
    'Coudre les épaules/côtés',
    category !== 'jupe' && category !== 'pantalon' ? 'Poser les manches' : null,
    'Poser la ceinture/ourlets',
    'Finitions'
  ].filter(Boolean);
}

function generateFabricTips(fabric) {
  const tips = {
    coton: 'Lavable à 40°C, repassage moyen',
    soie: 'Nettoyage à sec recommandé',
    jersey: 'Ne pas étirer pendant la couture',
    jean: 'Délaver avant coupe pour éviter le retrait',
    laine: 'Lavage main ou nettoyage à sec',
    lin: 'Se froisse facilement, repasser humide',
    velours: 'Brosser dans le sens du poil'
  };
  return tips[fabric] || 'Suivre les instructions du fabricant';
}

// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PatternCut Pro server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
});

module.exports = app;