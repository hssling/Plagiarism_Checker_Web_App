/**
 * Image Plagiarism Detection using Perceptual Hashing (pHash)
 * (Detects resized, compressed, or slightly modified images)
 */

/**
 * Compute average pixel intensity
 */
function getAverageBrightness(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        // Simple luminance formula: 0.299R + 0.587G + 0.114B
        const brightness = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
        sum += brightness;
    }
    return sum / (data.length / 4);
}

/**
 * Generate pHash from an Image object/URL
 * Returns a 64-bit binary string
 */
export async function generateImageHash(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Allow loading from external URLs
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 1. Resize to 32x32 (simplifies high frequencies)
            // Smaller size = faster, larger = more detail
            canvas.width = 32;
            canvas.height = 32;

            ctx.drawImage(img, 0, 0, 32, 32);
            const imageData = ctx.getImageData(0, 0, 32, 32);
            const data = imageData.data;

            // 2. Compute average brightness
            const avg = getAverageBrightness(data);

            // 3. Compute Hash (1 if > avg, 0 if < avg)
            let hash = '';
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
                hash += (brightness > avg ? '1' : '0');
            }

            resolve(hash);
        };
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
    });
}

/**
 * Calculate similarity between two image hashes (Hamming Distance)
 */
export function calculateImageSimilarity(hash1, hash2) {
    if (hash1.length !== hash2.length) return 0;

    let similarityCount = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) similarityCount++;
    }

    return (similarityCount / hash1.length) * 100;
}
