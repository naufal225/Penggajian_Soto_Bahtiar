import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface EmployeeFormFieldsProps {
  title: string;
  submitLabel: string;
  name: string;
  phoneNumber: string;
  notes: string;
  loading: boolean;
  generalError: string | null;
  nameError?: string;
  phoneNumberError?: string;
  notesError?: string;
  onNameChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}

export default function EmployeeFormFields({
  title,
  submitLabel,
  name,
  phoneNumber,
  notes,
  loading,
  generalError,
  nameError,
  phoneNumberError,
  notesError,
  onNameChange,
  onPhoneNumberChange,
  onNotesChange,
  onSubmit,
}: EmployeeFormFieldsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nama</Text>
        <TextInput
          style={styles.input}
          placeholder="Masukkan nama karyawan"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={onNameChange}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nomor HP</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="Masukkan nomor HP"
          placeholderTextColor="#6B7280"
          value={phoneNumber}
          onChangeText={onPhoneNumberChange}
        />
        {phoneNumberError ? <Text style={styles.errorText}>{phoneNumberError}</Text> : null}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Tambahan catatan (opsional)"
          placeholderTextColor="#6B7280"
          value={notes}
          onChangeText={onNotesChange}
          textAlignVertical="top"
        />
        {notesError ? <Text style={styles.errorText}>{notesError}</Text> : null}
      </View>

      {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

      <Pressable style={styles.submitButton} disabled={loading} onPress={onSubmit}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{submitLabel}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F1F5F9',
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#111827',
    fontSize: 15,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
});
