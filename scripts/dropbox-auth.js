// Utilitário de linha de comando para vincular o Dropbox e gerar o DROPBOX_REFRESH_TOKEN permanente no .env.
// Uso:
//   npm run dropbox:auth
//   npm run dropbox:auth -- <CODIGO_GERADO_NO_DROPBOX>
const readline = require('readline');
const { getDropboxConfig, exchangeAuthorizationCode } = require('../src/lib/dropbox');

async function main() {
  const cfg = getDropboxConfig();
  if (!cfg.hasAppCredentials) {
    console.error('ERRO: Defina DROPBOX_APP_KEY e DROPBOX_APP_SECRET no arquivo .env antes de executar.');
    process.exit(1);
  }

  const argCode = process.argv[2];
  if (argCode) {
    await exchangeAuthorizationCode(argCode);
    console.log('✔ Dropbox vinculado com sucesso! DROPBOX_REFRESH_TOKEN salvo no arquivo .env.');
    return;
  }

  console.log('\n=== Vincular Dropbox ao Harmonia ===');
  console.log('1. Abra o link abaixo no seu navegador e clique em "Permitir" (Allow):');
  console.log(`\n   ${cfg.authorizeUrl}\n`);
  console.log('2. Copie o código exibido pelo Dropbox e cole abaixo:\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => rl.question('Código de autorização: ', resolve));
  rl.close();

  await exchangeAuthorizationCode(code);
  console.log('\n✔ Dropbox vinculado com sucesso! DROPBOX_REFRESH_TOKEN salvo no arquivo .env.');
}

main().catch((err) => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
