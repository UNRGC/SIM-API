const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');
const argon2 = require('argon2');

const run = async () => {
  const rl = readline.createInterface({ input, output });
  const password = await rl.question('Password del usuario admin: ');
  rl.close();

  if (!password || password.length < 12) {
    throw new Error('Usa un password de al menos 12 caracteres.');
  }

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log(hash);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
