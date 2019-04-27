export function configSetValue(state, cfg) {
  let obj = state;
  for (const i of cfg.path) {
    obj = obj[i];
  }
  obj.value = cfg.value;
}
