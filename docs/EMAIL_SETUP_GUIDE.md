# 📧 Guia de Configuração de Email

## 🎯 Como Configurar Notificações por Email

### 📋 **Pré-requisitos**:
- Conta de email (Gmail recomendado)
- Senha de app configurada (para Gmail)

---

## 🔧 **Configuração para Gmail** (Recomendado)

### **1. Ativar Verificação em 2 Etapas**:
1. Acesse [myaccount.google.com](https://myaccount.google.com)
2. Vá em **"Segurança"**
3. Ative **"Verificação em duas etapas"**

### **2. Gerar Senha de App**:
1. Ainda em **"Segurança"**
2. Clique em **"Senhas de app"**
3. Selecione **"Outro (nome personalizado)"**
4. Digite: **"Lembrete Pro"**
5. **Copie a senha gerada** (16 caracteres)

### **3. Configurar no App**:
- **Servidor SMTP**: `smtp.gmail.com`
- **Porta SMTP**: `587`
- **E-mail remetente**: `seu-email@gmail.com`
- **Senha**: Cole a **senha de app** (não sua senha normal!)
- **E-mail destinatário**: Email que receberá os lembretes

---

## 🔧 **Outras Configurações**

### **Outlook/Hotmail**:
- **Servidor SMTP**: `smtp-mail.outlook.com`
- **Porta SMTP**: `587`
- **Senha**: Senha normal da conta

### **Yahoo**:
- **Servidor SMTP**: `smtp.mail.yahoo.com`
- **Porta SMTP**: `587`
- **Senha**: Senha de app (similar ao Gmail)

---

## ✅ **Como Testar**

### **1. Configurar**:
- Preencha todos os campos
- Ative **"Ativar envio por e-mail"**
- Clique em **"Salvar"**

### **2. Testar**:
- Clique em **"📧 Enviar Email de Teste"**
- Verifique se recebeu o email
- Se não recebeu, verifique:
  - Caixa de spam
  - Configurações SMTP
  - Senha de app

### **3. Usar**:
- Crie um lembrete
- Ative **"Notificar no horário"**
- No horário programado, receberá:
  - Notificação no navegador
  - Email (se configurado)

---

## ❓ **Problemas Comuns**

### **"Falha na autenticação"**:
- ✅ Use **senha de app**, não senha normal
- ✅ Verifique se a verificação em 2 etapas está ativa
- ✅ Confirme o email remetente

### **"Conexão recusada"**:
- ✅ Verifique servidor SMTP e porta
- ✅ Gmail: `smtp.gmail.com:587`
- ✅ Teste conexão de internet

### **"Email não chega"**:
- ✅ Verifique caixa de spam
- ✅ Confirme email destinatário
- ✅ Teste com **"Enviar Email de Teste"**

---

## 🎉 **Resultado Final**

Quando tudo estiver configurado:
- ✅ **Notificação no navegador** (imediata)
- ✅ **Email de lembrete** (backup)
- ✅ **Funciona mesmo offline** (email é enviado quando voltar online)

**Perfeito para não perder nenhum lembrete importante! 📧🔔**