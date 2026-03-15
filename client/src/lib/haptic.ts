export function hapticLight() {
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch {}
}

export function hapticMedium() {
  try {
    if (navigator.vibrate) navigator.vibrate(25);
  } catch {}
}

export function hapticSuccess() {
  try {
    if (navigator.vibrate) navigator.vibrate([10, 50, 20]);
  } catch {}
}

export function hapticError() {
  try {
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  } catch {}
}
