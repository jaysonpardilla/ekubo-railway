import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { programs as programsApi, beneficiaries as beneficiariesApi, applications as applicationsApi } from '../lib/api';
import { Program, Beneficiary } from '../types/database';
import FileUpload from '../components/FileUpload';

export default function ApplicationForm() {
  const { programId } = useParams<{ programId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [program, setProgram] = useState<Program | null>(null);
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile && programId) {
      fetchData();
    }
  }, [profile, programId]);

  const fetchData = async () => {
    if (!profile || !programId) return;

    try {
      try {
        const prog = await programsApi.getById(programId);
        setProgram(prog || null);
      } catch (err) {
        console.error('Failed to load program from API:', err);
        setProgram(null);
      }

      try {
        const ben = await beneficiariesApi.getByUserId(profile.id);
        setBeneficiary(ben || null);
      } catch (err) {
        console.error('Failed to load beneficiary from API:', err);
        setBeneficiary(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load program information');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = (field: string, url: string) => {
    setDocuments(prev => ({ ...prev, [field]: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!beneficiary || !program) {
      setError('Missing required information');
      setSubmitting(false);
      return;
    }

    const requiredDocuments = program.requirements.length;
    const uploadedDocuments = Object.keys(documents).length;

    if (uploadedDocuments < requiredDocuments) {
      setError('Please upload all required documents');
      setSubmitting(false);
      return;
    }

    try {
      // First try backend API
      try {
        await applicationsApi.create({ programId: program.id, formData: { ...formData, documents } });
        setSuccess(true);
        setTimeout(() => {
          navigate('/beneficiary/dashboard');
        }, 2000);
      } catch (apiErr) {
        console.error('Backend API error:', apiErr);
        throw apiErr;
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Program Not Found</h2>
          <button
            onClick={() => navigate('/beneficiary/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600">Your application has been successfully submitted.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/beneficiary/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{program.name}</h1>
          <p className="text-gray-600 mb-6">{program.description}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Form</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Application
                  </label>
                  <textarea
                    value={formData.reason || ''}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Information
                  </label>
                  <textarea
                    value={formData.additional_info || ''}
                    onChange={(e) => handleFormChange('additional_info', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
              <div className="space-y-4">
                {program.requirements.map((requirement, index) => (
                  <FileUpload
                    key={index}
                    label={`${requirement} *`}
                    onUploadComplete={(url) => handleDocumentUpload(requirement, url)}
                  />
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Your application will be reviewed by the BHW assigned to your barangay</li>
                <li>After BHW verification, it will be forwarded to MSWDO for approval</li>
                <li>You will receive notifications about the status of your application</li>
                <li>Once approved, you can download your approval slip and follow the claiming instructions</li>
              </ol>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
