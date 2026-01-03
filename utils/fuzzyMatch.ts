
/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Finds the best matching key from a list of candidates for a given target string.
 * Returns null if no match is found within the threshold.
 * 
 * @param target The string to match (e.g., CSV header "First Name")
 * @param candidates The list of valid keys (e.g., ["firstName", "lastName", "email"])
 * @param threshold Max distance allowed (default 3)
 */
export function findBestMatch(target: string, candidates: string[], threshold: number = 3): string | null {
    const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');

    let bestMatch = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
        const normalizedCandidate = candidate.toLowerCase();

        // Exact match check (after normalization)
        if (normalizedTarget === normalizedCandidate) return candidate;

        // Distance check
        const dist = levenshtein(normalizedTarget, normalizedCandidate);

        if (dist < minDistance && dist <= threshold) {
            minDistance = dist;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}
