import fs from 'fs';
import path from 'path';

const publicImagesDir = 'C:\\Users\\akshi\\Desktop\\FinMax\\public\\images';
const heroSrc = 'C:\\Users\\akshi\\.gemini\\antigravity\\brain\\1544317d-d04f-4826-867b-6c1e3c3d9e5d\\hero_city_night_1772295484044.png';
const splitSrc = 'C:\\Users\\akshi\\.gemini\\antigravity\\brain\\1544317d-d04f-4826-867b-6c1e3c3d9e5d\\split_kro_ui_premium_1772295519497.png';

if (!fs.existsSync(publicImagesDir)) {
    fs.mkdirSync(publicImagesDir, { recursive: true });
}

fs.copyFileSync(heroSrc, path.join(publicImagesDir, 'hero-city.png'));
fs.copyFileSync(splitSrc, path.join(publicImagesDir, 'split-kro.png'));

console.log('Successfully moved images to public/images');
