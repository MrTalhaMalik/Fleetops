// Driver status is derived from approval + event assignment + shift timestamps.
// We attach `status` on the way out of the API so the frontend doesn't have to compute it.
//
//   pending     account hasn't been approved yet
//   on-duty     accepted an event AND started shift (and hasn't stopped)
//   off-duty    accepted an event but not currently on shift
//   available   no accepted event
//
// Also re-packs the flattened locationLat/locationLng/locationUpdatedAt columns
// into the legacy `location: { lat, lng, updatedAt }` shape the frontend expects.
export function withStatus(driver) {
  if (!driver) return driver;
  let status = "available";
  if (!driver.approved) {
    status = "pending";
  } else if (driver.assignedEventId) {
    status =
      driver.shiftStartedAt && !driver.shiftEndedAt ? "on-duty" : "off-duty";
  }
  const { locationLat, locationLng, locationUpdatedAt, ...rest } = driver;
  return {
    ...rest,
    status,
    location: {
      lat: locationLat ?? 0,
      lng: locationLng ?? 0,
      updatedAt: locationUpdatedAt ?? null,
    },
  };
}

// Driver records hold base64 image blobs (QID + license). Strip them from list responses
// so we don't ship multi-MB payloads per row — fetch /drivers/:id/documents on demand.
export function withoutDocs(driver) {
  if (!driver) return driver;
  const { qidImage, licenseImage, ...rest } = driver;
  return rest;
}
