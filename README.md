# Scribbly - AI-Enhanced Note-Taking Application

Scribbly is a modern, feature-rich note-taking application that combines traditional note management with powerful AI capabilities. It offers a clean, intuitive interface with dark mode support and a suite of AI-powered tools to enhance your note-taking experience.

## 🌟 Key Features

### Note Management
- Create, edit, and delete notes with real-time saving
- Rich text editing capabilities
- Pin important notes to the top
- Search and filter notes
- Sort notes by last edited, recently created, or alphabetically
- Double-click to edit note titles inline
- Context menu for quick actions (view, rename, duplicate, delete)

### AI Tools Integration
- **Text Summarization**: Automatically generate concise summaries of your notes
- **Mind Map Generation**: Create visual mind maps from your notes
- **OCR Scanner**: Extract text from images
- **Text-to-Speech**: Convert your notes to audio
- **YouTube Integration**: Get relevant video suggestions based on your notes

### User Experience
- Responsive design for all screen sizes
- Dark/Light theme toggle
- Smooth animations and transitions
- Intuitive drag-and-drop interface
- Real-time search filtering
- Confirmation dialogs for destructive actions

## 🛠️ Technology Stack

### Frontend
- **React**: UI framework for building the user interface
- **D3.js**: Data visualization for mind maps
- **CSS Variables**: Dynamic theming system
- **React Context**: State management for auth and themes

### Backend
- **Node.js & Express**: RESTful API server
- **MongoDB**: Database for storing notes and user data
- **JWT**: Authentication and authorization
- **Bcrypt**: Password hashing
- **Multer**: File upload handling

### AI Service
- **FastAPI**: High-performance Python web framework
- **PyTorch**: Deep learning for text processing
- **Transformers**: NLP models for summarization
- **gTTS**: Text-to-speech conversion
- **Tesseract**: OCR processing
- **YouTube API**: Video recommendations
- **NLTK**: Natural language processing
- **NetworkX**: Graph visualization for mind maps

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MongoDB
- Tesseract OCR
- YouTube API Key

## 🚀 Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/scribbly.git
cd scribbly
\`\`\`

2. Install Frontend Dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`

3. Install Backend Dependencies:
\`\`\`bash
cd ../backend
npm install
\`\`\`

4. Install AI Service Dependencies:
\`\`\`bash
cd ../ai_service
pip install -r requirements.txt
\`\`\`

5. Set up Environment Variables:

Create .env files in each directory:

Backend (.env):
\`\`\`
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000
\`\`\`

AI Service (.env):
\`\`\`
YOUTUBE_API_KEY=your_youtube_api_key
MODEL_PATH=path_to_your_models
PORT=5001
\`\`\`

Frontend (.env):
\`\`\`
REACT_APP_API_URL=http://localhost:5000
REACT_APP_AI_SERVICE_URL=http://localhost:5001
\`\`\`

## 🎯 Running the Application

1. Start MongoDB:
Make sure MongoDB is running on your system.

2. Start the Backend Server:
\`\`\`bash
cd backend
node index.js
\`\`\`

3. Start the AI Service:
\`\`\`bash
cd ai_service
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
\`\`\`

4. Start the Frontend:
\`\`\`bash
cd frontend
npm start
\`\`\`

The application will be available at http://localhost:3000

## 🔑 API Keys Required

- **YouTube Data API Key**: Required for YouTube video suggestions
  - Get it from [Google Cloud Console](https://console.cloud.google.com/)
  - Enable YouTube Data API v3
  - Add to AI Service .env file

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for transformer models
- Google Cloud for YouTube API
- Tesseract OCR team
- All open-source contributors

---

For more information or support, please open an issue in the repository.
