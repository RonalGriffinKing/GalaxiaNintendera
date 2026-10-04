const os = require('node:os')

try {
  os.userInfo()
} catch (error) {
  // Node 24 puede fallar en algunas sesiones Windows administradas. El CLI de
  // Capacitor solo usa este dato para detectar la terminal.
  os.userInfo = () => ({
    uid: -1,
    gid: -1,
    username: process.env.USERNAME || 'user',
    homedir: process.env.USERPROFILE || process.cwd(),
    shell: process.env.COMSPEC || 'cmd.exe'
  })
}

process.argv = [process.argv[0], 'cap', ...process.argv.slice(2)]
require('../node_modules/@capacitor/cli/bin/capacitor')
