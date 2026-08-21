import bcrypt from "bcryptjs";

async function testPassword() {
  const password = "AdminFaith123!";
  const storedHash = "$2b$10$N/DajC3sGTrbgechgwaHxOLIaAtmhOPYjUISgPA3djypMYx5Oo8oK";
  
  const isValid = await bcrypt.compare(password, storedHash);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${storedHash}`);
  console.log(`Is valid: ${isValid}`);
  
  // Try wrong password
  const wrongPassword = "WrongPassword123!";
  const isWrongValid = await bcrypt.compare(wrongPassword, storedHash);
  console.log(`Wrong password: ${wrongPassword}`);
  console.log(`Is valid: ${isWrongValid}`);
}

testPassword();