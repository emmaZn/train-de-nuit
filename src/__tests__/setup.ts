// jsdom n'implémente pas HTMLCanvasElement.getContext, et PixiJS le sonde dès
// l'import pour détecter WebGL. Sans ce bouchon, chaque fichier de test écrit
// un « Not implemented » dans la sortie. Rendre null est exactement ce que
// voit un navigateur sans WebGL, le cas que la scène doit déjà savoir gérer.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
