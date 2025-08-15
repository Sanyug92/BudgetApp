const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../assets/images/generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Icon configurations with improved quality settings
const icons = [
  { name: 'app-icon-all.png', size: 1024, quality: 100 },
  { name: 'app-icon-ios.png', size: 1024, quality: 100 },
  { name: 'app-icon-android-legacy.png', size: 512, quality: 95 },
  { name: 'app-icon-android-adaptive-foreground.png', size: 864, quality: 100 }, // 2x for better quality
  { name: 'app-icon-web-favicon.png', size: 180, quality: 90 },
  { name: 'app-icon-android-adaptive-background.png', size: 324, quality: 90 },
];

// Path to source image - using the larger source
const sourceImage = path.join(__dirname, '../app-icon-large.png');

// Check if source image exists
if (!fs.existsSync(sourceImage)) {
  console.error(`Error: Source image not found at ${sourceImage}`);
  console.log('Please place your high-res source image (2048x2048px recommended) in the project root and name it app-icon-large.png');
  process.exit(1);
}

// Process each icon
async function generateIcons() {
  try {
    for (const icon of icons) {
      const outputPath = path.join(outputDir, icon.name);
      
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          kernel: sharp.kernel.lanczos3, // Higher quality resizing
          fastShrinkOnLoad: false // Better quality for downscaling
        })
        .png({ 
          quality: icon.quality,
          force: true
        })
        .toFile(outputPath);
      
      console.log(`Generated ${icon.name} (${icon.size}x${icon.size}px)`);
    }
    
    console.log('\n✅ All icons have been generated successfully!');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log('\nNext steps:');
    console.log('1. Review the generated icons in the output directory');
    console.log('2. Copy them to the assets/images/ directory');
    console.log('3. Run: npx expo prebuild --clean');
    console.log('4. Rebuild your app');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

// Run the script
generateIcons();
