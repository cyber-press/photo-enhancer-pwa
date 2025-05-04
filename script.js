
const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const blurSlider = document.getElementById('blurRange');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let currentBlur = 5;

upload.addEventListener('change', async () => {
  const file = upload.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = async () => {
    canvas.width = img.width;
    canvas.height = img.height;
    originalImage = img;
    await applySkinSmoothing(currentBlur);
  };

  const reader = new FileReader();
  reader.onload = e => {
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

blurSlider.addEventListener('input', () => {
  currentBlur = parseInt(blurSlider.value);
  if (originalImage) applySkinSmoothing(currentBlur);
});

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'enhanced-photo.png';
  link.href = canvas.toDataURL();
  link.click();
});

async function applySkinSmoothing(blurAmount) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImage, 0, 0);
  canvas.style.display = 'block';
  loader.style.display = 'inline';
  loader.innerText = 'Detecting face...';

  const detection = await faceapi
    .detectSingleFace(originalImage, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (!detection) {
    loader.innerText = 'No face detected.';
    return;
  }

  loader.innerText = 'Enhancing...';

  const landmarks = detection.landmarks;
  const positions = landmarks.positions;

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = canvas.width;
  blurredCanvas.height = canvas.height;
  const blurredCtx = blurredCanvas.getContext('2d');

  blurredCtx.filter = `blur(${blurAmount}px)`;
  blurredCtx.drawImage(originalImage, 0, 0);
  blurredCtx.filter = 'none';

  const jawline = positions.slice(0, 17);
  const leftBrow = positions.slice(17, 22);
  const rightBrow = positions.slice(22, 27);
  const extendedForehead = leftBrow.concat(rightBrow).map(p => ({ x: p.x, y: p.y - 40 }));

  ctx.save();
  ctx.beginPath();

  jawline.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });

  extendedForehead.reverse().forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(blurredCanvas, 0, 0);
  ctx.restore();

  loader.innerText = 'Face enhanced!';
}


document.getElementById('blemishBtn').addEventListener('click', () => {
  blemishMode = !blemishMode;
  alert(blemishMode ? 'Blemish mode ON: Tap to blur spots' : 'Blemish mode OFF');
});

canvas.addEventListener('click', (e) => {
  if (!blemishMode || !originalImage) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const patchSize = 60;
  const radius = patchSize / 2;

  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = patchSize;
  patchCanvas.height = patchSize;
  const patchCtx = patchCanvas.getContext('2d');

  patchCtx.drawImage(canvas, x - radius, y - radius, patchSize, patchSize, 0, 0, patchSize, patchSize);
  patchCtx.filter = 'blur(5px)';
  patchCtx.drawImage(patchCanvas, 0, 0);
  ctx.drawImage(patchCanvas, x - radius, y - radius);
});


function applyBeautifyFilter(type) {
  if (!originalImage) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (type) {
    case 'natural':
      ctx.filter = 'brightness(1.05) contrast(1.05) saturate(1.1)';
      break;
    case 'glow':
      ctx.filter = 'brightness(1.1) blur(1px) contrast(1.1)';
      break;
    case 'studio':
      ctx.filter = 'brightness(1.2) contrast(1.15) saturate(1.2)';
      break;
    default:
      ctx.filter = 'none';
  }

  ctx.drawImage(originalImage, 0, 0);
  ctx.filter = 'none';
}
