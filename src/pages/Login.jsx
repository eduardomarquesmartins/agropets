import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { emailService } from '../services/emailService';
import { toast } from 'react-hot-toast';

import { User, Lock, Mail, ArrowRight, Phone, Calendar, MapPin, Hash, LifeBuoy, Eye, EyeOff } from 'lucide-react';
import { validateCPF, formatCPF, formatPhone, validateCEP, formatCEP } from '../utils/stringUtils';
import './Login.css';

const Login = () => {
  const [step, setStep] = useState('selection'); // selection, signup, completion, forgot-password, claim-account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isClaimingAccount, setIsClaimingAccount] = useState(false);
  const { login, signup, loginWithGoogle, updateProfile } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [profileData, setProfileData] = useState({
    cpf: '',
    whatsapp: '',
    birthDate: '',
    cep: '',
    endereco: '',
    number: '',
    bairro: '',
    city: ''
  });


  const fetchAddress = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      if (!validateCEP(cleanCep)) {
        toast.error('A Agropets atende somente Viamão (CEP 94400-000 a 94599-999)');
        return;
      }
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setProfileData(prev => ({
            ...prev,
            cep: formatCEP(cleanCep),
            endereco: data.logradouro,
            bairro: data.bairro,
            city: data.localidade
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCPF(profileData.cpf)) {
      toast.error('CPF inválido. Por favor, verifique os números.');
      return;
    }

    if (profileData.whatsapp.replace(/\D/g, '').length < 10) {
      toast.error('Telefone inválido. Informe o DDD e o número.');
      return;
    }

    await updateProfile(profileData);
    toast.success('Cadastro finalizado com sucesso!');
    navigate(redirectPath);
  };

  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      const loggedUser = await login(email, password);
      if (loggedUser) {
        if (loggedUser.role === 'admin') {
          navigate('/admin');
        } else if (loggedUser.role === 'vet') {
          navigate('/vet');
        } else if (loggedUser.role === 'seller') {
          navigate('/vendedor');
        } else if (!loggedUser.isProfileComplete) {
          setStep('completion');
        } else {
          navigate(redirectPath);
        }
      } else {
        toast.error('E-mail ou senha incorretos.');
      }
    }
  };

  const redirectLoggedUser = (loggedUser) => {
    if (loggedUser.role === 'admin') {
      navigate('/admin');
    } else if (loggedUser.role === 'vet') {
      navigate('/vet');
    } else if (loggedUser.role === 'seller') {
      navigate('/vendedor');
    } else if (!loggedUser.isProfileComplete) {
      setStep('completion');
    } else {
      navigate(redirectPath);
    }
  };

  const handleClaimAccount = async (e) => {
    e.preventDefault();
    const phone = profileData.whatsapp.replace(/\D/g, '');

    if (!email || phone.length < 10 || password.length < 12) {
      toast.error('Informe o e-mail, telefone cadastrado e uma senha de pelo menos 12 caracteres.');
      return;
    }

    setIsClaimingAccount(true);
    try {
      const response = await fetch('/api/claim-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível ativar a conta.');
      }

      const loggedUser = await login(email, password);
      if (!loggedUser) throw new Error('Conta ativada, mas não foi possível iniciar a sessão. Tente entrar novamente.');
      toast.success('Senha criada e conta ativada com sucesso!');
      redirectLoggedUser(loggedUser);
    } catch (error) {
      toast.error(error.message || 'Não foi possível ativar a conta.');
    } finally {
      setIsClaimingAccount(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Por favor, preencha todos os campos básicos.');
      return;
    }

    if (!validateCPF(profileData.cpf)) {
      toast.error('CPF inválido. Por favor, verifique os números.');
      return;
    }

    if (profileData.whatsapp.replace(/\D/g, '').length < 10) {
      toast.error('Telefone inválido. Informe o DDD e o número.');
      return;
    }

    const newUser = await signup({ 
      name, 
      email, 
      password, 
      ...profileData,
      isProfileComplete: true 
    });
    
    if (newUser) {
      if (newUser.needsEmailConfirmation) {
        toast.success('Conta criada. Confirme o e-mail para entrar.');
        setStep('selection');
        return;
      }
      toast.success('Conta criada com sucesso!');
      navigate(redirectPath);
    } else {
      toast.error('Erro ao criar conta. Tente novamente.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, informe seu e-mail.');
      return;
    }

    setIsSendingEmail(true);
    const result = await emailService.sendPasswordResetEmail(email);
    setIsSendingEmail(false);

    if (result.success) {
      toast.success('E-mail de recuperação enviado!');
      setStep('selection');
    } else {
      toast.error(result.error || 'Erro ao enviar e-mail.');
    }
  };

  const helpMessage = encodeURIComponent('Olá, preciso de ajuda com o meu acesso ao sistema Agropets.');
  const whatsappNumber = (settings.whatsapp || '5551996240794').replace(/\D/g, '');
  const whatsappHelpUrl = `https://wa.me/${whatsappNumber}?text=${helpMessage}`;




  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>
              {step === 'completion' ? 'Só mais alguns detalhes...' : 
               step === 'signup' ? 'Crie sua conta' : 
               step === 'forgot-password' ? 'Recuperar Senha' : 'Bem-vindo'}
            </h1>
            <p>
              {step === 'completion' 
                ? 'Para sua segurança e entrega, precisamos completar seu cadastro.' 
                : step === 'signup'
                ? 'Preencha os dados abaixo para começar sua jornada na Agropets.'
                : step === 'forgot-password'
                ? 'Informe seu e-mail para receber as instruções de recuperação.'
                : step === 'claim-account'
                ? 'Confirme o telefone do cadastro e defina sua nova senha. Não enviaremos e-mail.'
                : 'Acesse sua conta para realizar um pedido.'}
            </p>
          </div>

          {step === 'selection' ? (
            <>
              <form className="login-form" onSubmit={handleTraditionalLogin}>
                <div className="input-group">
                  <label><Mail size={18} /> E-mail</label>
                  <input 
                    type="email" 
                    placeholder="exemplo@email.com" 
                    value={email || ''}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label><Lock size={18} /> Senha</label>
                  <div className="password-input-wrapper" style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password || ''}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: '45px' }}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <div className="remember-me">
                    <input type="checkbox" id="remember" />
                    <label htmlFor="remember">Lembrar de mim</label>
                  </div>
                  <button type="button" className="forgot-password-link" onClick={() => setStep('forgot-password')}>
                    Esqueci a senha
                  </button>
                </div>

                <button type="submit" className="btn-login" disabled={isSendingEmail}>
                  Entrar <ArrowRight size={18} />
                </button>
              </form>

              <div className="login-divider" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <span>ou entre com</span>
              </div>

              <div className="social-login-main" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    const loggedUser = await loginWithGoogle(credentialResponse.credential);
                    if (loggedUser) {
                      if (!loggedUser.isProfileComplete) {
                        setStep('completion');
                      } else {
                        navigate(redirectPath);
                      }
                    }
                  }}
                  onError={() => {
                    // Falha silenciosa no console, erro já tratado pelo componente
                  }}                  theme="filled_green"
                  shape="pill"
                  width="320"
                />
              </div>

              <div className="login-footer">
                <p>Não tem uma conta? <button className="btn-link" onClick={() => setStep('signup')}>Cadastre-se</button></p>
              </div>
            </>
          ) : step === 'signup' ? (
            <>
              <form className="login-form fade-in" onSubmit={handleSignup}>
                <div className="input-group">
                  <label><User size={18} /> Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Seu nome" 
                    value={name || ''}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Mail size={18} /> E-mail</label>
                    <input 
                      type="email" 
                      placeholder="exemplo@email.com" 
                      value={email || ''}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label><Lock size={18} /> Senha</label>
                    <div className="password-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ paddingRight: '45px' }}
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Hash size={18} /> CPF</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00" 
                      required 
                      value={profileData.cpf}
                      onChange={e => setProfileData({...profileData, cpf: formatCPF(e.target.value)})}
                    />
                  </div>
                  <div className="input-group">
                    <label><Phone size={18} /> WhatsApp</label>
                    <input 
                      type="tel" 
                      placeholder="(00) 00000-0000" 
                      required 
                      value={profileData.whatsapp}
                      onChange={e => setProfileData({...profileData, whatsapp: formatPhone(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Calendar size={18} /> Nascimento</label>
                    <input 
                      type="date" 
                      required 
                      value={profileData.birthDate}
                      onChange={e => setProfileData({...profileData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label><Hash size={18} /> CEP</label>
                    <input 
                      type="text" 
                      placeholder="00000-000" 
                      required 
                      value={profileData.cep}
                      onChange={e => {
                        const val = e.target.value;
                        setProfileData({...profileData, cep: formatCEP(val)});
                        if (val.replace(/\D/g, '').length === 8) {
                          fetchAddress(val);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label><MapPin size={18} /> Logradouro</label>
                  <input 
                    type="text" 
                    placeholder="Rua, Avenida, etc" 
                    required 
                    value={profileData.endereco}
                    onChange={e => setProfileData({...profileData, endereco: e.target.value})}
                  />
                </div>

                <div className="input-row">
                  <div className="input-group" style={{ flex: '1' }}>
                    <label>Nº</label>
                    <input 
                      type="text" 
                      placeholder="123" 
                      required 
                      value={profileData.number}
                      onChange={e => setProfileData({...profileData, number: e.target.value})}
                    />
                  </div>
                  <div className="input-group" style={{ flex: '2' }}>
                    <label>Bairro</label>
                    <input 
                      type="text" 
                      placeholder="Seu bairro" 
                      required 
                      value={profileData.bairro}
                      onChange={e => setProfileData({...profileData, bairro: e.target.value})}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-login">
                  Criar Conta <ArrowRight size={18} />
                </button>
              </form>

              <div className="login-footer">
                <p>Já tem uma conta? <button className="btn-link" onClick={() => setStep('selection')}>Fazer Login</button></p>
              </div>
            </>
          ) : step === 'forgot-password' ? (
            <>
              <form className="login-form fade-in" onSubmit={handleForgotPassword}>
                <div className="input-group">
                  <label><Mail size={18} /> E-mail da conta</label>
                  <input 
                    type="email" 
                    placeholder="exemplo@email.com" 
                    value={email || ''}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-login" disabled={isSendingEmail}>
                  {isSendingEmail ? 'Enviando...' : 'Enviar e-mail de recuperação'} <Mail size={18} />
                </button>
              </form>

              <div className="login-footer">
                <p>Lembrou a senha? <button className="btn-link" onClick={() => setStep('selection')}>Voltar para Login</button></p>
              </div>
            </>
          ) : step === 'claim-account' ? (
            <>
              <form className="login-form fade-in" onSubmit={handleClaimAccount}>
                <div className="input-group">
                  <label><Mail size={18} /> E-mail cadastrado</label>
                  <input
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email || ''}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label><Phone size={18} /> Telefone cadastrado</label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={profileData.whatsapp || ''}
                    onChange={e => setProfileData({ ...profileData, whatsapp: formatPhone(e.target.value) })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label><Lock size={18} /> Crie uma senha</label>
                  <div className="password-input-wrapper" style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo de 12 caracteres"
                      value={password || ''}
                      onChange={e => setPassword(e.target.value)}
                      minLength="12"
                      required
                      style={{ paddingRight: '45px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-login" disabled={isClaimingAccount}>
                  {isClaimingAccount ? 'Ativando...' : 'Criar senha e entrar'} <ArrowRight size={18} />
                </button>
              </form>

              <div className="login-footer">
                <p>Já criou sua senha? <button className="btn-link" onClick={() => setStep('selection')}>Fazer Login</button></p>
              </div>
            </>
          ) : (
            <form className="login-form completion-form fade-in" onSubmit={handleProfileSubmit}>
                <div className="input-row">
                  <div className="input-group">
                    <label><Hash size={18} /> CPF</label>
                      <input 
                        type="text" 
                        placeholder="000.000.000-00" 
                        required 
                        value={profileData.cpf || ''}
                        onChange={e => setProfileData({...profileData, cpf: formatCPF(e.target.value)})}
                      />
                  </div>
                  <div className="input-group">
                    <label><Phone size={18} /> WhatsApp</label>
                      <input 
                        type="tel" 
                        placeholder="(00) 00000-0000" 
                        required 
                        value={profileData.whatsapp || ''}
                        onChange={e => setProfileData({...profileData, whatsapp: formatPhone(e.target.value)})}
                      />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label><Calendar size={18} /> Nascimento</label>
                    <input 
                      type="date" 
                      required 
                      value={profileData.birthDate}
                      onChange={e => setProfileData({...profileData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label><Hash size={18} /> CEP</label>
                    <input 
                      type="text" 
                      placeholder="00000-000" 
                      required 
                      value={profileData.cep}
                      onChange={e => {
                        const val = e.target.value;
                        setProfileData({...profileData, cep: formatCEP(val)});
                        if (val.replace(/\D/g, '').length === 8) {
                          fetchAddress(val);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label><MapPin size={18} /> Logradouro</label>
                  <input 
                    type="text" 
                    placeholder="Rua, Avenida, etc" 
                    required 
                    value={profileData.endereco}
                    onChange={e => setProfileData({...profileData, endereco: e.target.value})}
                  />
                </div>

                <div className="input-row">
                  <div className="input-group" style={{ flex: '1' }}>
                    <label>Nº</label>
                    <input 
                      type="text" 
                      placeholder="123" 
                      required 
                      value={profileData.number}
                      onChange={e => setProfileData({...profileData, number: e.target.value})}
                    />
                  </div>
                  <div className="input-group" style={{ flex: '2' }}>
                    <label>Bairro</label>
                    <input 
                      type="text" 
                      placeholder="Seu bairro" 
                      required 
                      value={profileData.bairro}
                      onChange={e => setProfileData({...profileData, bairro: e.target.value})}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-login">
                  Finalizar Cadastro <ArrowRight size={18} />
                </button>
            </form>
          )}

          <div className="login-footer">
            <p>Precisa de ajuda? <a href={whatsappHelpUrl} target="_blank" rel="noopener noreferrer" className="btn-link">Fale conosco</a></p>
          </div>
        </div>
        
        <div className="login-image">
           <div className="image-overlay">
              <h2>O melhor para o seu pet está aqui.</h2>
              <p>Produtos selecionados com carinho para quem você mais ama.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
