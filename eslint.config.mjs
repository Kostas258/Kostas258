// Analyse statique des scripts, branchée dans verify.sh.
//
// Ce qu'elle attrape et ce qu'elle n'attrape pas, mesuré le 28/08 : sur les
// quinze scripts du projet, zéro erreur et neuf avertissements, tous des
// imports inutilisés. Aucun des bugs réels de la session n'aurait été détecté
// ici — compteur d'essais lu au mauvais endroit, réponses en cache réinterrogées,
// octet 0x08 dans un motif, témoin de test qui est aussi un mot de la page.
// Ce sont des erreurs de sens, pas de forme.
//
// Elle reste utile pour ce qu'elle fait bien et que la relecture rate : variable
// non définie, clé dupliquée, code inatteignable, condition constante,
// comparaison à NaN, `typeof` mal orthographié. C'est peu, c'est gratuit, et
// c'est du temps de relecture rendu disponible pour le reste.
//
// shellcheck aurait couvert les fichiers .sh, mais le téléchargement de son
// binaire est bloqué par la passerelle (403). Les scripts bash restent donc
// couverts par `bash -n` seul, qui ne voit que la syntaxe.
export default [
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly', module: 'writable', exports: 'writable',
        process: 'readonly', console: 'readonly', __dirname: 'readonly',
        __filename: 'readonly', Buffer: 'readonly', URL: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
      },
    },
    rules: {
      // Erreurs : elles font échouer verify.sh.
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-const-assign': 'error',
      'no-fallthrough': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-async-promise-executor': 'error',
      // Écrit dans une variable partagée après un await, entre deux lectures :
      // la classe de bug la plus proche de ceux rencontrés ici.
      'require-atomic-updates': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // Avertissements : signalés, sans bloquer. Un import inutilisé est
      // souvent le vestige d'une intention abandonnée — dnsrobot_api.js importe
      // recordBlock sans s'en servir — et mérite un regard, pas un blocage.
      'no-unused-vars': ['warn', { args: 'none' }],
    },
  },
];
