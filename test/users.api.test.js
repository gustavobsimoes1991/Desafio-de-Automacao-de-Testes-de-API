const axios = require('axios');
const { expect } = require('chai');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://serverest.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const client = axios.create({
  baseURL: `${API_BASE_URL}/usuarios`,
  headers: { 'Content-Type': 'application/json' },

  validateStatus: () => true 
});

describe('Serverest API Users – Test Suite Completa', function () {
  this.timeout(120000);

  let token;
  let createdUserId;
  let testUser = {
    nome: 'Usuário Teste Automatizado',
    email: `user_${Date.now()}@qa.com`,
    password: '123456',
    administrador: 'true'
  };

  before(async () => {
    const res = await axios.post(`${API_BASE_URL}/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (res.status === 200 && res.data.authorization) {
      token = res.data.authorization;
    } else {
      throw new Error('Falha ao obter token JWT: verifique ADMIN_EMAIL e ADMIN_PASSWORD.');
    }
  });

  it('POST /usuarios – deve criar novo usuário com sucesso', async () => {
    const res = await client.post('/', testUser, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).to.be.oneOf([201, 200]);
    expect(res.data).to.have.property('_id');
    createdUserId = res.data._id;
  });

  it('GET /usuarios – deve retornar lista contendo o usuário criado', async () => {
    const res = await client.get('/');
    expect(res.status).to.equal(200);
    const found = res.data.usuarios.find(u => u._id === createdUserId);
    expect(found).to.exist;
  });

  it('GET /usuarios/{id} – deve retornar detalhes do usuário criado', async () => {
    const res = await client.get(`/${createdUserId}`);
    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('nome', testUser.nome);
  });

  it('PUT /usuarios/{id} – deve atualizar informações do usuário', async () => {
    const update = {
      nome: testUser.nome + ' Atualizado',
      email: testUser.email,
      password: testUser.password,
      administrador: testUser.administrador
    };

    const res = await client.put(`/${createdUserId}`, update, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).to.be.oneOf([200]);
    expect(res.data.message || res.data).to.match(/Registro alterado com sucesso/i);
  });

  it('DELETE /usuarios/{id} – deve excluir o usuário criado', async () => {
    const res = await client.delete(`/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).to.be.oneOf([200, 204]);
    expect(res.data.message || '').to.match(/Registro excluído com sucesso/i);
  });

  it('POST /usuarios – valida campos obrigatórios (nome, email, password, administrador)', async () => {
    const invalidUser = {};
    const res = await client.post('/', invalidUser);
    
    expect(res.status).to.equal(400); // 👈 Garante o status 400
    expect(res.data.message || '').to.match(/Todos os campos são obrigatórios/i); 
  });

  it('Proteção do endpoint – deve exigir token para alterar ou excluir usuário', async () => {
    const updateData = {
      nome: 'Sem Token',
      email: testUser.email,
      password: testUser.password,
      administrador: 'true'
    };
    
    const resPut = await client.put(`/${createdUserId}`, updateData);
    
    expect(resPut.status).to.be.oneOf([401, 403]); 
    
    const resDelete = await client.delete(`/${createdUserId}`);
    
    expect(resDelete.status).to.be.oneOf([401, 403]); 
  });
  
  it.skip('Rate-limit: exceder 100 requisições/min deve gerar 429 (não aplicável à API pública Serverest)', async function () {
    this.skip();
  });
});
