import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/router';
import { loadBatches, deleteBatch } from '../lib/import-processor';
import type { ImportBatch } from '../lib/import-types';
import { ArrowLeft, FileText, Trash2, CreditCard as Edit } from 'lucide-react';

interface ImportWorkspaceProps {
  roadmapId: string;
}

export function ImportWorkspace({ roadmapId }: ImportWorkspaceProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatchList();
  }, []);

  const loadBatchList = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await loadBatches(user.id, roadmapId);
      setBatches(data);
    } catch (error) {
      console.error('Failed to load batches:', error);
      alert(error instanceof Error ? error.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Delete batch "${batchName}"? This will permanently remove all candidates in this batch.`)) {
      return;
    }

    try {
      await deleteBatch(batchId);
      await loadBatchList();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete batch');
    }
  };


  const getStatusBadge = (batch: ImportBatch) => {
    const pending = batch.totalRows - batch.importedCount - batch.ignoredCount;

    if (batch.importedCount === batch.totalRows) {
      return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Completed</span>;
    }
    if (batch.importedCount > 0) {
      return <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">In Progress</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-800">New</span>;
  };

  const getSourceLabel = (sourceSystem: string) => {
    switch (sourceSystem) {
      case 'orgcs_engagement':
        return 'OrgCS Engagement';
      case 'org62_support':
        return 'Org62 Support';
      case 'org62_training':
        return 'Org62 Training';
      default:
        return sourceSystem;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/roadmap/${roadmapId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmap
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Workspace</h1>
              <p className="text-gray-600 mt-1">Manage and review imported data batches</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading batches...</div>
          </div>
        ) : batches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No import batches yet</h3>
            <p className="text-gray-600">Upload a file from the roadmap builder to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batches.map((batch) => {
                  const pending = batch.totalRows - batch.importedCount - batch.ignoredCount;

                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{batch.batchName}</div>
                        {batch.notes && (
                          <div className="text-sm text-gray-500 mt-1">{batch.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getSourceLabel(batch.sourceSystem)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {batch.fileName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {batch.importedCount} of {batch.totalRows} imported
                          </div>
                          <div className="text-gray-500 text-xs mt-1 space-x-2">
                            <span>{batch.ignoredCount} ignored</span>
                            {batch.skippedCount !== undefined && batch.skippedCount > 0 && (
                              <span>· {batch.skippedCount} skipped</span>
                            )}
                            {batch.failedCount !== undefined && batch.failedCount > 0 && (
                              <span className="text-red-600">· {batch.failedCount} failed</span>
                            )}
                            <span>· {pending} pending</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(batch)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/import-staging/${roadmapId}/${batch.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Review batch"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
