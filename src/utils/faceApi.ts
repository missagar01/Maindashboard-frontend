let faceApiPromise: Promise<any> | null = null;
let faceModelsPromise: Promise<void> | null = null;

export const loadFaceApi = (): Promise<any> => {
  if (faceApiPromise) return faceApiPromise;

  faceApiPromise = new Promise((resolve, reject) => {
    if ((window as any).faceapi) {
      resolve((window as any).faceapi);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).faceapi);
    };
    script.onerror = () => {
      faceApiPromise = null;
      reject(new Error("Failed to load face-api.js from CDN"));
    };
    document.body.appendChild(script);
  });

  return faceApiPromise;
};

export const loadModels = async (faceapi: any) => {
  if (faceModelsPromise) {
    return faceModelsPromise;
  }

  const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models/";
  faceModelsPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
    .then(() => undefined)
    .catch((error) => {
      faceModelsPromise = null;
      throw error;
    });

  return faceModelsPromise;
};

export const preloadFaceBiometrics = async (): Promise<any> => {
  const faceapi = await loadFaceApi();
  await loadModels(faceapi);
  return faceapi;
};
