# PatternCut Pro - Render Deployment

## 🚀 Déploiement sur Render.com

### Méthode 1: Déploiement via Git

1. **Créer un repo GitHub/GitLab** avec ces fichiers
2. **Connecter à Render**:
   - Dashboard Render → "New" → "Web Service"
   - Connecter votre repo
   - Configurer:
     - **Language**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free
   - **Environment Variables**:
     - `PORT`: `10000`
     - `NODE_ENV`: `production`

### Méthode 2: Déploiement via ZIP

1. **Télécharger le ZIP** fourni
2. **Extraire** les fichiers
3. **Uploader sur Render**:
   - Dashboard → "New" → "Web Service"
   - "Upload ZIP file"
   - Sélectionner `patterncut-pro-render.zip`
   - Configurer comme ci-dessus

## 📁 Structure du Projet

```
patterncut-pro-render/
├── server.js          # Serveur Express principal
├── package.json       # Dépendances Node.js
├── render.yaml        # Configuration Render (Infrastructure as Code)
├── .env.example       # Variables d'environnement exemple
├── public/            # Frontend statique
│   ├── index.html
│   ├── css/
│   └── js/
└── uploads/           # Images uploadées (créé automatiquement)
```

## 🔧 Configuration Requise

- **Node.js**: >= 18.0.0
- **Port**: 10000 (configurable via variable d'environnement PORT)
- **Mémoire**: 512MB minimum (Free tier Render)

## 🌐 Endpoints API

- `GET /` - Interface utilisateur
- `GET /health` - Vérification santé
- `GET /api/patterns` - Liste des modèles
- `POST /api/patterns` - Créer un modèle
- `POST /api/generate` - Générer plan de coupe
- `POST /api/upload` - Upload d'image

## 📝 Notes

- Les données sont stockées en mémoire (perdues au redémarrage)
- Pour production: ajouter MongoDB/PostgreSQL
- Les images sont stockées dans `/uploads`
