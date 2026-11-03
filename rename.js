import fs from 'fs';
import path from 'path';

const basePath = 'c:\\\\Users\\\\akshi\\\\Desktop\\\\FinMax';

try {
    if (fs.existsSync(path.join(basePath, 'figma-make.config.json'))) {
        fs.renameSync(path.join(basePath, 'figma-make.config.json'), path.join(basePath, 'custom-make.config.json'));
        console.log('Renamed figma-make.config.json');
    }
    if (fs.existsSync(path.join(basePath, 'figma-make.toml'))) {
        fs.renameSync(path.join(basePath, 'figma-make.toml'), path.join(basePath, 'custom-make.toml'));
        console.log('Renamed figma-make.toml');
    }
    if (fs.existsSync(path.join(basePath, 'src/app/components/figma'))) {
        fs.renameSync(path.join(basePath, 'src/app/components/figma'), path.join(basePath, 'src/app/components/images'));
        console.log('Renamed figma directory');
    }
} catch (e) {
    console.error(e);
}
