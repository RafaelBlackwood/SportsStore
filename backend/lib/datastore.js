const fs = require("node:fs");
const path = require("node:path");

class JsonStore {
  constructor(config) {
    this.dataFile = config.dataFile;
    this.seedFile = config.seedFile;
    this.ensureDataFile();
  }

  ensureDataFile() {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    if (!fs.existsSync(this.dataFile)) {
      const seed = fs.readFileSync(this.seedFile, "utf8");
      fs.writeFileSync(this.dataFile, seed);
    }
  }

  read() {
    this.ensureDataFile();
    return JSON.parse(fs.readFileSync(this.dataFile, "utf8"));
  }

  write(state) {
    const now = new Date().toISOString();
    const nextState = { ...state, updatedAt: now };
    const tmpFile = `${this.dataFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, `${JSON.stringify(nextState, null, 2)}\n`);
    fs.renameSync(tmpFile, this.dataFile);
    return nextState;
  }

  update(mutator) {
    const state = this.read();
    const result = mutator(state);
    this.write(state);
    return result;
  }
}

module.exports = {
  JsonStore
};
