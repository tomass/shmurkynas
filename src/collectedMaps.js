// The treasure map pieces this player has found. Pieces are kept in the browser
// and every piece remembers the place it had on the whole map, so the pieces of
// one adventure can be laid back together.

const keyPrefix = 'treasureMap_';

// A stored piece is a picture plus its place on the whole map. Pieces kept by an
// older version of the game are only a picture and have no place.
function readStoredPiece(value) {
    if (!value) {
        return null;
    }
    if (value.startsWith('data:image/')) {
        return { image: value, piece: null };
    }
    try {
        const stored = JSON.parse(value);
        return stored && stored.image ? stored : null;
    } catch (error) {
        console.log('Could not read a stored treasure map piece:', error);
        return null;
    }
}

// All the kept pieces, gathered by the adventure they belong to.
export function collectPiecesByAdventure() {
    const byAdventure = new Map();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(keyPrefix)) {
            continue;
        }
        const stored = readStoredPiece(localStorage.getItem(key));
        if (!stored) {
            continue;
        }
        // The key is treasureMap_<adventure>_<piece>
        const rest = key.substring(keyPrefix.length);
        const adventureId = rest.substring(0, rest.lastIndexOf('_'));
        if (!byAdventure.has(adventureId)) {
            byAdventure.set(adventureId, []);
        }
        byAdventure.get(adventureId).push(stored);
    }
    return byAdventure;
}

function loadImageElement(source) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
    });
}

// Lays all the pieces of one adventure back where they came from. Pieces which
// have not been found yet simply leave holes in the map.
export async function combinePieces(pieces) {
    const placed = pieces.filter(piece => piece.piece);
    if (placed.length === 0) {
        return pieces.length ? pieces[0].image : null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = placed[0].piece.sheetWidth;
    canvas.height = placed[0].piece.sheetHeight;
    const context = canvas.getContext('2d');

    const images = await Promise.all(placed.map(piece => loadImageElement(piece.image)));
    images.forEach((image, i) => {
        if (image) {
            context.drawImage(image, placed[i].piece.x, placed[i].piece.y);
        }
    });

    return canvas.toDataURL('image/png');
}

// One picture per adventure, with all of its found pieces already put together.
export async function collectedMapImages() {
    const images = [];
    for (const pieces of collectPiecesByAdventure().values()) {
        const image = await combinePieces(pieces);
        if (image) {
            images.push(image);
        }
    }
    return images;
}
