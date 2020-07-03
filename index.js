const express = require('express'); // Módulo express
const http = require('http'); // Módulo HTTP nativo do NodeJS
const socketio = require('socket.io'); // Módulo Socket.io
const path = require('path');
const URL = require('url');

const app = express();
const server = http.createServer(app);
const sockets = socketio(server); // Socket.io retorna uma instância de server

// Factory de usuário
function criaUsuario(id, nome, online, mensagem = '') {
  let usuario = {
    id: id,
    nome: nome,
    online: online,
    mensagem: mensagem
  };

  return usuario;
}

let nomeTemp; // Nome temporário
let usuariosOnline = []; // Array de usuários

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/chat.html'));

  let { nome } = URL.parse(req.url, true).query;
  nomeTemp = nome;
});

sockets.on('connect', (socket) => {
  let usuario = criaUsuario(socket.id, nomeTemp, 'online');
  usuariosOnline.push(usuario);

  // Emite o id do novo socket conectado para todos os outros sockets conectados.
  console.log(`Usuário ${usuario.nome} online!`);
  sockets.emit('connected', usuariosOnline);

  // Fica esperando o evento Chat message ser enviado pelo cliente.
  socket.on('Chat message', (mensagem) => {
    usuario.mensagem = mensagem;
    sockets.emit('broadcast', usuario); // Emite para todos os usuários conectados um objeto que contém o usuário e a mensagem que ele enviouuy.
  });

  socket.on('typing', (mensagem) => {
    socket.broadcast.emit('typing', `${usuario.nome} está ${mensagem}`); // socket.broadcast.emit emite para todos exceto para o socket emitente.
  });

  // socket.on('disconnect') dispara o evento de desconectado
  socket.on('disconnect', () => {
    usuariosOnline = usuariosOnline.filter((user) => user.id !== usuario.id); // Filtra o usuário que se desconectou.

    let infoDisconnect = {
      usuarioDesconectado: usuario,
      usuariosOnline: usuariosOnline
    };

    console.log(`Usuário ${usuario.nome} offline!`);
    sockets.emit('userDisconnect', infoDisconnect); // Emite o evento usuário desconectado e envia o id para todos os sockets conectados.
  });
});

server.listen(3000, () => {
  console.log(`Estado do servidor: ONLINE`);
});
