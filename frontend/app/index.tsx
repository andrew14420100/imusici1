import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { router } from 'expo-router';

type LoginMode = 'select' | 'login';
type SelectedRole = 'amministratore' | 'insegnante' | 'allievo';

export default function LandingPage() {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    loginWithCredentials
  } = useAuth();
  
  const [loginMode, setLoginMode] = useState<LoginMode>('select');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('allievo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>('');

  // Se l'utente è già autenticato, redirect alla home
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('User already authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, user]);

  const handleLogin = async () => {
    setLoginError('');
    
    if (!email || !password) {
      setLoginError('Inserisci email e password');
      return;
    }
    
    setIsSubmitting(true);
    const result = await loginWithCredentials(email, password);
    setIsSubmitting(false);
    
    if (result.success) {
      // Redirect manuale dopo login riuscito
      router.replace('/(tabs)');
    } else {
      setLoginError(result.error || 'Email o password non validi');
    }
  };

  const selectRoleAndLogin = (role: SelectedRole) => {
    setSelectedRole(role);
    setEmail('');
    setLoginError('');
    setPassword('');
    setLoginMode('login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  const getRoleInfo = () => {
    switch (selectedRole) {
      case 'amministratore':
        return { icon: 'shield-checkmark', color: '#4A90D9', title: 'Amministratore' };
      case 'insegnante':
        return { icon: 'school', color: '#F59E0B', title: 'Insegnante' };
      case 'allievo':
        return { icon: 'person', color: '#10B981', title: 'Allievo' };
    }
  };

  const renderSelectMode = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="musical-notes" size={44} color="#4A90D9" />
        </View>
        <Text style={styles.title}>Accademia de</Text>
        <Text style={styles.titleHighlight}>"I Musici"</Text>
      </View>

      {/* Login Options */}
      <View style={styles.loginSection}>
        <Text style={styles.loginTitle}>Accedi come:</Text>
        
        {/* Admin Login */}
        <TouchableOpacity 
          style={[styles.roleButton, styles.adminButton]} 
          onPress={() => selectRoleAndLogin('amministratore')}
        >
          <View style={styles.roleButtonContent}>
            <View style={[styles.roleIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Amministratore</Text>
              <Text style={styles.roleDesc}>Gestione completa dell'accademia</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        
        {/* Teacher Login */}
        <TouchableOpacity 
          style={[styles.roleButton, styles.teacherButton]} 
          onPress={() => selectRoleAndLogin('insegnante')}
        >
          <View style={styles.roleButtonContent}>
            <View style={[styles.roleIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="school" size={24} color="#fff" />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Insegnante</Text>
              <Text style={styles.roleDesc}>Gestione lezioni e presenze</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        
        {/* Student Login */}
        <TouchableOpacity 
          style={[styles.roleButton, styles.studentButton]} 
          onPress={() => selectRoleAndLogin('allievo')}
        >
          <View style={styles.roleButtonContent}>
            <View style={[styles.roleIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Allievo</Text>
              <Text style={styles.roleDesc}>Visualizza corsi e pagamenti</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.infoText}>
            Le credenziali vengono fornite dall'amministrazione.{'\n'}
            In caso di problemi, contatta la segreteria.
          </Text>
        </View>
      </View>
    </>
  );

  const renderLoginForm = () => {
    const roleInfo = getRoleInfo();
    
    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={() => setLoginMode('select')}>
          <Ionicons name="arrow-back" size={24} color="#4A90D9" />
          <Text style={styles.backText}>Indietro</Text>
        </TouchableOpacity>

        <View style={styles.formHeader}>
          <View style={[styles.formIcon, { backgroundColor: roleInfo.color }]}>
            <Ionicons name={roleInfo.icon as any} size={32} color="#fff" />
          </View>
          <Text style={styles.formTitle}>Accesso {roleInfo.title}</Text>
          <Text style={styles.formSubtitle}>
            Inserisci le tue credenziali
          </Text>
        </View>

        <View style={styles.form}>
          {/* Messaggio di errore rosso */}
          {loginError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputContainer, loginError && styles.inputError]}>
              <Ionicons name="mail" size={20} color={loginError ? "#DC2626" : "#999"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => { setEmail(text); setLoginError(''); }}
                placeholder="email@esempio.it"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, loginError && styles.inputError]}>
              <Ionicons name="lock-closed" size={20} color={loginError ? "#DC2626" : "#999"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => { setPassword(text); setLoginError(''); }}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: roleInfo.color }, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Accedi</Text>
            )}
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Ionicons name="help-circle" size={18} color="#4A90D9" />
            <Text style={styles.warningText}>
              Non ricordi le credenziali? Contatta l'amministrazione per assistenza.
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loginMode === 'select' && renderSelectMode()}
          {loginMode === 'login' && renderLoginForm()}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Accademia de "I Musici"</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#333',
  },
  titleHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90D9',
    marginTop: 2,
  },
  loginSection: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  adminButton: {
    backgroundColor: '#4A90D9',
  },
  teacherButton: {
    backgroundColor: '#F59E0B',
  },
  studentButton: {
    backgroundColor: '#10B981',
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  roleDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    lineHeight: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backText: {
    fontSize: 16,
    color: '#4A90D9',
    marginLeft: 8,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 10,
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#4A90D9',
    marginLeft: 10,
    lineHeight: 18,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
