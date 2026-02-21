import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import logo from '../assets/logo.jpg';
import { auth } from '../lib/api';
import { BARANGAYS, DISABILITY_TYPES, Classification, UserType, DisabilityType } from '../types/database';
import LocationPicker from '../components/LocationPicker';
import FileUpload from '../components/FileUpload';

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    userType: '' as UserType | '',
    classification: '' as Classification | '',
    disabilityType: '' as DisabilityType | '',
    latitude: 0,
    longitude: 0,
  });

  const [documents, setDocuments] = useState({
    senior_id_url: '',
    psa_url: '',
    postal_id_url: '',
    voters_id_url: '',
    national_id_url: '',
    medical_cert_url: '',
    govt_id_url: '',
    pwd_form_url: '',
    barangay_cert_url: '',
    death_cert_url: '',
    medical_records_url: '',
  });

  useEffect(() => {
    // No need to check admin exists for Django backend
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleDocumentUpload = (field: keyof typeof documents, url: string) => {
    setDocuments(prev => ({ ...prev, [field]: url }));
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (!formData.address) {
      setError('Please select your barangay');
      return false;
    }

    if (!formData.userType) {
      setError('Please select a user type');
      return false;
    }

    if (formData.userType === 'beneficiary') {
      if (!formData.classification) {
        setError('Please select your classification');
        return false;
      }

      if (formData.latitude === 0 && formData.longitude === 0) {
        setError('Please select your location on the map');
        return false;
      }

      if (formData.classification === 'senior_citizen') {
        if (!documents.senior_id_url || !documents.psa_url) {
          setError('Please upload required documents for Senior Citizen');
          return false;
        }
      } else if (formData.classification === 'pwd') {
        if (!formData.disabilityType) {
          setError('Please select your disability type');
          return false;
        }
        if (!documents.medical_cert_url || !documents.govt_id_url || !documents.pwd_form_url) {
          setError('Please upload required documents for PWD');
          return false;
        }
      } else if (formData.classification === 'solo_parent') {
        if (!documents.barangay_cert_url || !documents.death_cert_url) {
          setError('Please upload required documents for Solo Parent');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: '',
        username: formData.username,
        address: formData.address,
        userType: formData.userType as string,
      };

      // Add beneficiary-specific fields if signing up as beneficiary
      if (formData.userType === 'beneficiary') {
        signupData.classification = formData.classification;
        signupData.latitude = formData.latitude;
        signupData.longitude = formData.longitude;
        signupData.disabilityType = formData.disabilityType;
      }

      const result = await auth.signup(signupData);

      if (result && result.token) {
        // Signup successful, redirect to login
        navigate('/login', { state: { message: 'Account created successfully. Please log in.' } });
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const availableUserTypes = () => {
    return ['beneficiary', 'admin', 'bhw', 'mswdo'];
  };

  const renderDocumentUploads = () => {
    if (formData.userType !== 'beneficiary' || !formData.classification) return null;

    if (formData.classification === 'senior_citizen') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Senior Citizen Requirements</h3>
          <FileUpload
            label="Senior ID *"
            onUploadComplete={(url) => handleDocumentUpload('senior_id_url', url)}
          />
          <FileUpload
            label="PSA Birth Certificate *"
            onUploadComplete={(url) => handleDocumentUpload('psa_url', url)}
          />
          <FileUpload
            label="Postal ID"
            onUploadComplete={(url) => handleDocumentUpload('postal_id_url', url)}
          />
          <FileUpload
            label="Voter's ID"
            onUploadComplete={(url) => handleDocumentUpload('voters_id_url', url)}
          />
          <FileUpload
            label="National ID"
            onUploadComplete={(url) => handleDocumentUpload('national_id_url', url)}
          />
        </div>
      );
    }

    if (formData.classification === 'pwd') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">PWD Requirements</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type of Disability *
            </label>
            <select
              name="disabilityType"
              value={formData.disabilityType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Disability Type</option>
              {DISABILITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <FileUpload
            label="Medical Certificate *"
            onUploadComplete={(url) => handleDocumentUpload('medical_cert_url', url)}
          />
          <FileUpload
            label="Valid Government ID *"
            onUploadComplete={(url) => handleDocumentUpload('govt_id_url', url)}
          />
          <FileUpload
            label="Completed PWD ID Application Form *"
            onUploadComplete={(url) => handleDocumentUpload('pwd_form_url', url)}
          />
        </div>
      );
    }

    if (formData.classification === 'solo_parent') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Solo Parent Requirements</h3>
          <FileUpload
            label="Barangay Certificate *"
            onUploadComplete={(url) => handleDocumentUpload('barangay_cert_url', url)}
          />
          <FileUpload
            label="Death Certificate *"
            onUploadComplete={(url) => handleDocumentUpload('death_cert_url', url)}
          />
          <FileUpload
            label="Medical Records"
            onUploadComplete={(url) => handleDocumentUpload('medical_records_url', url)}
          />
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <img src={logo} alt="Logo" className="w-16 h-16 object-cover rounded-full" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">MSWDO Social Welfare Registration</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showPassword" className="text-sm text-gray-600">
              Show passwords
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barangay *
            </label>
            <select
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Barangay</option>
              {BARANGAYS.map((barangay) => (
                <option key={barangay} value={barangay}>
                  {barangay}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Type *
            </label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select User Type</option>
              {availableUserTypes().map((type) => (
                <option key={type} value={type}>
                  {type === 'beneficiary' ? 'Beneficiary' : 'Admin'}
                </option>
              ))}
            </select>
          </div>

          {formData.userType === 'beneficiary' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classification *
                </label>
                <select
                  name="classification"
                  value={formData.classification}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Classification</option>
                  <option value="senior_citizen">Senior Citizen</option>
                  <option value="pwd">Person with Disability (PWD)</option>
                  <option value="solo_parent">Solo Parent</option>
                </select>
              </div>

              {formData.classification && (
                <>
                  {renderDocumentUploads()}

                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialLat={formData.latitude || undefined}
                    initialLng={formData.longitude || undefined}
                  />
                </>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
