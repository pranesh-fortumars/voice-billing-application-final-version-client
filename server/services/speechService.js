const vosk = require('vosk');
const path = require('path');
const fs = require('fs');

// Path to Vosk models - these should be in a 'models' directory in the server folder
const MODELS_PATH = path.join(__dirname, '..', 'models');
const EN_MODEL_PATH = path.join(MODELS_PATH, 'vosk-model-small-en-us-0.15');
const TA_MODEL_PATH = path.join(MODELS_PATH, 'vosk-model-small-tamil-0.22');

let enModel = null;
let taModel = null;

// Initialize models
const initializeModels = () => {
  console.log('🎙️ Initializing Offline Speech Models...');
  
  if (!fs.existsSync(MODELS_PATH)) {
    fs.mkdirSync(MODELS_PATH, { recursive: true });
    console.warn('⚠️ Models directory created. Please place Vosk models in:', MODELS_PATH);
    return;
  }

  try {
    if (fs.existsSync(EN_MODEL_PATH)) {
      enModel = new vosk.Model(EN_MODEL_PATH);
      console.log('✅ English Model loaded successfully');
    } else {
      console.warn('⚠️ English Model not found at:', EN_MODEL_PATH);
    }

    if (fs.existsSync(TA_MODEL_PATH)) {
      taModel = new vosk.Model(TA_MODEL_PATH);
      console.log('✅ Tamil Model loaded successfully');
    } else {
      console.warn('⚠️ Tamil Model not found at:', TA_MODEL_PATH);
    }
  } catch (error) {
    console.error('❌ Error loading Vosk models:', error);
  }
};

const handleSpeechSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Voice client connected:', socket.id);

    let recognizer = null;
    let currentLang = 'en';

    socket.on('start-recognition', (data) => {
      const { language } = data || { language: 'en' };
      currentLang = language;
      
      const model = language === 'ta' ? taModel : enModel;
      
      if (!model) {
        socket.emit('recognition-error', `Model for ${language} not loaded on server.`);
        return;
      }

      console.log(`🎤 Starting ${language} recognition for ${socket.id}`);
      
      try {
        // Vosk expects 16kHz mono 16-bit PCM
        recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
        recognizer.setWords(true);
      } catch (error) {
        console.error('Error creating recognizer:', error);
        socket.emit('recognition-error', 'Failed to initialize recognizer');
      }
    });

    socket.on('audio-data', (data) => {
      if (!recognizer) return;

      try {
        // Data is expected to be a Buffer of 16-bit PCM audio
        if (recognizer.acceptWaveform(data)) {
          const result = recognizer.result();
          if (result.text) {
            socket.emit('recognition-result', {
              text: result.text,
              isFinal: true,
              confidence: 1.0 // Vosk small models don't provide reliable confidence per result easily
            });
          }
        } else {
          const partial = recognizer.partialResult();
          if (partial.partial) {
            socket.emit('recognition-result', {
              text: partial.partial,
              isFinal: false,
              confidence: 0.5
            });
          }
        }
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    });

    socket.on('stop-recognition', () => {
      if (recognizer) {
        const finalResult = recognizer.finalResult();
        if (finalResult.text) {
          socket.emit('recognition-result', {
            text: finalResult.text,
            isFinal: true,
            confidence: 1.0
          });
        }
        recognizer.free();
        recognizer = null;
        console.log(`🛑 Recognition stopped for ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      if (recognizer) {
        recognizer.free();
        recognizer = null;
      }
      console.log('🔌 Voice client disconnected:', socket.id);
    });
  });
};

module.exports = {
  initializeModels,
  handleSpeechSocket
};
