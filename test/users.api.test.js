const axios = require('axios');
const { expect } = require('chai');
const config = require('../config');

const client = axios.create({
  baseURL: config.baseURL,
  timeout: config.requestTimeout,
  headers: { 'Content-Type': 'application/json' }
});

describe('Serverest API Users – Test Suite Completa', function () {
  this.timeout(120000);

  let token = null;
  let createdUserId = null;
  const uniqueSuffix = Date.now();
  const testUser = {
    nome: `Teste Usuário ${uniqueSuffix}`,
    email: `teste${uniqueSuffix}@example.com`,
    password: 'Senha123!',
    administrador: 'true'
  };

  before('Autenticar e obter token JWT', async () => {
    try {
      const resp = await client.post('/login', {
        email: config.adminEmail,
        password: config.adminPassword
      });

      token = resp.data.authorization || resp.data.token;
      expect(token, 'Token JWT não foi retornado').to.exist;
    } catch (err) {
      console.error('Erro ao autenticar:', err.response ? err.response.data : err.message);
      throw err;
    }
  });

  it('POST /usuarios – deve criar novo usuário com sucesso', async () => {
    const res = await client.post('/usuarios', testUser, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200,201]);
    const body = res.data;
    
    const id = body._id || body._idUsuario;
    expect(id, 'Id do usuário não foi retornado').to.exist;
    createdUserId = id;
  });

  it('GET /usuarios – deve retornar lista contendo o usuário criado', async () => {
    const res = await client.get('/usuarios', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.equal(200);
    const usuarios = res.data.usuarios || res.data;
    const found = usuarios.find(u => u.email === testUser.email);
    expect(found, 'Usuário criado não encontrado na listagem').to.exist;
  });

  it('GET /usuarios/{id} – deve retornar detalhes do usuário criado', async () => {
    const res = await client.get(`/usuarios/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.equal(200);
    const userObj = res.data.usuario || res.data;
    expect(userObj).to.have.property('email', testUser.email);
    expect(userObj).to.have.property('nome', testUser.nome);
  });

  it('PUT /usuarios/{id} – deve atualizar informações do usuário', async () => {
    const update = { nome: testUser.nome + ' Atualizado' };
    const res = await client.put(`/usuarios/${createdUserId}`, update, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200,204]);

    if (res.data && res.data.usuario) {
      expect(res.data.usuario.nome).to.equal(update.nome);
    }

    const getRes = await client.get(`/usuarios/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const uObj = getRes.data.usuario || getRes.data;
    expect(uObj.nome).to.contain('Atualizado');
  });

  it('DELETE /usuarios/{id} – deve excluir o usuário criado', async () => {
    const res = await client.delete(`/usuarios/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200,204]);
    try {
      await client.get(`/usuarios/${createdUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      throw new Error('Usuário ainda existe após delete');
    } catch (err) {
      const status = err.response && err.response.status;
      expect(status).to.be.oneOf([400,404,410]);
    }
  });

  it('POST /usuarios – valida campos obrigatórios (nome, email, password, administrador)', async () => {
    const invalidCases = [
      { payload: { email: `no-name${uniqueSuffix}@example.com`, password: 'Senha1!', administrador: 'true' }, missing: 'nome' },
      { payload: { nome: 'Sem Email', password: 'Senha1!', administrador: 'true' }, missing: 'email' },
      { payload: { nome: 'Sem Password', email: `no-pass${uniqueSuffix}@example.com`, administrador: 'true' }, missing: 'password' },
      { payload: { nome: 'Sem Admin', email: `no-admin${uniqueSuffix}@example.com`, password: 'Senha1!' }, missing: 'administrador' }
    ];

    for (const c of invalidCases) {
      try {
        const res = await client.post('/usuarios', c.payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.status).to.not.equal(201, `Payload sem ${c.missing} foi aceito erroneamente`);
      } catch (err) {
        const status = err.response && err.response.status;
        expect(status, `Status inesperado para falta de ${c.missing}`).to.be.oneOf([400,422]);
      }
    }
  });

  it('Proteção do endpoint – sem token deve recusar acesso', async () => {
    try {
      await client.get('/usuarios');
      throw new Error('Acesso permitido sem token');
    } catch (err) {
      const status = err.response && err.response.status;
      expect(status).to.be.oneOf([401,403]);
    }
  });

  it('Rate-limit: exceder 100 requisições/min deve gerar 429', async function () {
    const requests = [];
    const total = 101;
    for (let i = 0; i < total; i++) {
      requests.push(
        client.get('/usuarios', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => ({ status: r.status }))
        .catch(e => ({ status: e.response ? e.response.status : 'ERR' }))
      );
    }
    const results = await Promise.all(requests);
    const statusCounts = results.reduce((acc, r) => {
      const s = String(r.status);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const saw429 = statusCounts['429'] > 0;
    expect(saw429, `Esperava pelo menos um 429, obtido: ${JSON.stringify(statusCounts)}`).to.be.true;
  });

});
