export function hasCoordinates(location) {
    return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
}
