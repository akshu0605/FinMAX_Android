import fs from 'fs';
import path from 'path';

const artifactDir = 'C:\\Users\\akshi\\.gemini\\antigravity\\brain\\1544317d-d04f-4826-867b-6c1e3c3d9e5d';
const publicDir = 'C:\\Users\\akshi\\Desktop\\FinMax\\public';

const images = [
    { src: 'media__1772289021332.jpg', dest: 'hero-city.jpg' },
    { src: 'media__1772289038417.jpg', dest: 'hero-phone.jpg' },
    { src: 'media__1772289048575.jpg', dest: 'hero-hand.jpg' }
];

try {
    for (const img of images) {
        const srcPath = path.join(artifactDir, img.src);
        const destPath = path.join(publicDir, img.dest);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${img.src} to ${img.dest}`);
        } else {
            console.error(`Source file not found: ${srcPath}`);
        }
    }
    console.log('Done!');
} catch (error) {
    console.error('Error copying files:', error);
}
