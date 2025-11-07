const axios = require('axios');
const { expect } = require('chai');
const config = require('../config');

const client = axios.create({
  baseURL: config.baseURL,
  timeout: config.requestTimeout,
  headers: { 'Content-Type': 'application/json' }
});

describe('API Users - Test Suite Completa', function () {
  this.timeout(120000); // 2 minutos

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
      token = resp.data.authorization || resp.data.token || (resp.data && resp.data.token);
      if (!token) {
      }
      if (token && token.startsWith('Bearer ')) token = token.replace('Bearer ', '');
    } catch (err) {
      console.warn('Falha ao obter token no before():', err.message);
      throw err;
    }
  });

  it('POST /users - deve criar um novo usuário com sucesso', async () => {
    const res = await client.post('/users', testUser, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200, 201]);
    const body = res.data;
    const id = body._id || body.id || (body && body.data && body.data._id);
    expect(id).to.exist;
    createdUserId = id;
  });

  it('GET /users - deve retornar lista contendo o usuário criado', async () => {
    const res = await client.get('/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.equal(200);
    const users = Array.isArray(res.data) ? res.data : (res.data && res.data.users) || (res.data && res.data.data) || [];
    const found = users.find(u => u.email === testUser.email || (u && u.usuario && u.usuario.email === testUser.email));
    expect(found, 'Usuário criado não foi encontrado na listagem').to.exist;
  });

  it('GET /users/{id} - deve retornar detalhes do usuário criado', async () => {
    const res = await client.get(`/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.equal(200);
    const body = res.data;
    expect(body).to.be.an('object');
    const userObj = body.user || body || (body.data && body.data.user);
    expect(userObj).to.have.property('email');
    expect(userObj.email).to.equal(testUser.email);
  });

  it('PUT /users/{id} - deve atualizar informações do usuário', async () => {
    const update = { nome: testUser.nome + ' atualizado' };
    const res = await client.put(`/users/${createdUserId}`, update, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200, 204]);
    if (res.data) {
      const u = res.data.user || res.data;
      if (u && u.nome) expect(u.nome).to.equal(update.nome);
    }
    const getRes = await client.get(`/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const uObj = getRes.data.user || getRes.data;
    expect(uObj.nome || uObj.nomeUsuario || uObj.name).to.satisfy(n => String(n).includes('atualizado'));
  });

  it('DELETE /users/{id} - deve excluir o usuário criado', async () => {
    const res = await client.delete(`/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).to.be.oneOf([200, 204]);
    try {
      await client.get(`/users/${createdUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const get = await client.get(`/users/${createdUserId}`, { headers: { Authorization: `Bearer ${token}` } });
      const u = get.data.user || get.data;
      expect(u).to.not.exist;
    } catch (err) {
      const status = err.response && err.response.status;
      expect(status).to.be.oneOf([404, 410, 400]);
    }
  });

  it('POST /users - validações de campos obrigatórios (nome, email, password, administrador)', async () => {
    const cases = [
      {
        payload: { email: `no-name${uniqueSuffix}@example.com`, password: 'Senha1!', administrador: 'true' },
        missing: 'nome'
      },
      {
        payload: { nome: 'Sem Email', password: 'Senha1!', administrador: 'true' },
        missing: 'email'
      },
      {
        payload: { nome: 'Sem Password', email: `no-pass${uniqueSuffix}@example.com`, administrador: 'true' },
        missing: 'password'
      },
      {
        payload: { nome: 'Sem Admin', email: `no-admin${uniqueSuffix}@example.com`, password: 'Senha1!' },
        missing: 'administrador'
      }
    ];

    for (const c of cases) {
      try {
        const res = await client.post('/users', c.payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.status).to.not.equal(201, `Payload sem ${c.missing} foi aceito erroneamente`);
      } catch (err) {
        const status = err.response && err.response.status;
        expect(status).to.be.oneOf([400, 422]);
      }
    }
  });

  it('Autenticação: endpoints protegidos rejeitam requisição sem token', async () => {
    try {
      await client.get('/users');
      throw new Error('Endpoint /users respondeu 200 sem token — esperado proteção.');
    } catch (err) {
      if (!err.response) throw err;
      expect(err.response.status).to.be.oneOf([401, 403]);
    }
  });

  it('Rate-limit: exceder 100 req/min deve resultar em 429 (ou similar)', async function () {
    const requests = [];
    const total = 101;
    for (let i = 0; i < total; i++) {
      requests.push(
        client.get('/users', { headers: { Authorization: `Bearer ${token}` } })
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
    expect(saw429, `Nenhuma resposta 429 encontrada — status counts: ${JSON.stringify(statusCounts)}`).to.be.true;
  });

});
