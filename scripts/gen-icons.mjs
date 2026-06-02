import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root   = join(__dirname, '..')
const source = join(root, 'public', 'icons', 'logo-source.png')
const outDir = join(root, 'public', 'icons')

const sizes = [
  { name: 'logo.png',                 size: 512 },
  { name: 'apple-touch-icon.png',     size: 180 },
  { name: 'apple-touch-icon-180.png', size: 180 },
  { name: 'apple-touch-icon-167.png', size: 167 },
  { name: 'apple-touch-icon-152.png', size: 152 },
  { name: 'apple-touch-icon-120.png', size: 120 },
]

for (const { name, size } of sizes) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(outDir, name))

  console.log(`✓ ${name} (${size}x${size})`)
}
