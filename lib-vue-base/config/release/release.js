
const fs = require("fs")
let publishJson = fs.readFileSync("./config/release/publish.json")

fs.writeFileSync("./lib/lib-vue-base/package.json", publishJson)