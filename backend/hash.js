const bcrypt = require("bcrypt");

async function run() {
  const password = "admin123";   // your chosen password
  const hash = await bcrypt.hash(password, 10);

  console.log("HASHED PASSWORD:");
  console.log(hash);
}

run();
