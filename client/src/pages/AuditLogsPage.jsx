import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  DatePicker,
  Tag,
  Typography,
  Alert,
  Spin,
  Row,
  Col,
  Tooltip,
  Badge,
  Collapse,
  Pagination
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { auditAPI } from '../utils/api';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const AuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    user_id: '',
    date_from: null,
    date_to: null,
    search: ''
  });

  const actionColors = {
    LOGIN: 'success',
    LOGOUT: 'processing',
    CREATE: 'default',
    UPDATE: 'warning',
    DELETE: 'error'
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page,
        limit: pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null
          )
        )
      };

      if (filters.date_from) {
        params.date_from = filters.date_from.format('YYYY-MM-DD');
      }
      if (filters.date_to) {
        params.date_to = filters.date_to.format('YYYY-MM-DD');
      }

      const response = await auditAPI.getLogs(params);
      
      setAuditLogs(response.logs || []);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Erreur lors du chargement des logs d\'audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      table_name: '',
      user_id: '',
      date_from: null,
      date_to: null,
      search: ''
    });
    setPage(1);
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        date_from: dates[0],
        date_to: dates[1]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        date_from: null,
        date_to: null
      }));
    }
  };

  const formatAdditionalInfo = (info) => {
    if (!info) return '-';
    try {
      const parsed = typeof info === 'string' ? JSON.parse(info) : info;
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return info.toString();
    }
  };

  const columns = [
    {
      title: 'Date/Heure',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
      sorter: true,
    },
    {
      title: 'Utilisateur',
      key: 'user',
      width: 150,
      render: (_, record) => (
        <div>
          {record.user ? (
            <>
              <div className="font-medium">{record.user.username}</div>
              <Badge 
                size="small" 
                status="default" 
                text={record.user.role}
                className="text-xs text-gray-500"
              />
            </>
          ) : (
            <Text type="secondary">Système</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={actionColors[action] || 'default'}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Table',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Enregistrement',
      dataIndex: 'record_id',
      key: 'record_id',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Informations',
      dataIndex: 'additional_info',
      key: 'additional_info',
      width: 200,
      render: (info) => (
        <Tooltip title={formatAdditionalInfo(info)} placement="topLeft">
          <div className="truncate max-w-[180px]">
            {formatAdditionalInfo(info)}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (text) => (
        <Text code>{text || '-'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Voir les détails">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              // TODO: Implement view details modal
              console.log('View details for:', record.id);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>Logs d'Audit</Title>
        <Text type="secondary">
          Historique de toutes les actions effectuées sur le système
        </Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {/* Filters */}
      <Card className="mb-6">
        <Collapse defaultActiveKey={['1']}>
          <Panel 
            header={
              <div className="flex items-center">
                <FilterOutlined className="mr-2" />
                Filtres
              </div>
            } 
            key="1"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Search
                  placeholder="Recherche..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onSearch={applyFilters}
                  enterButton
                />
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={6}>
                <Select
                  placeholder="Action"
                  value={filters.action}
                  onChange={(value) => handleFilterChange('action', value)}
                  className="w-full"
                  allowClear
                >
                  <Option value="LOGIN">LOGIN</Option>
                  <Option value="LOGOUT">LOGOUT</Option>
                  <Option value="CREATE">CREATE</Option>
                  <Option value="UPDATE">UPDATE</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Select
                  placeholder="Table"
                  value={filters.table_name}
                  onChange={(value) => handleFilterChange('table_name', value)}
                  className="w-full"
                  allowClear
                >
                  <Option value="orders">Commandes</Option>
                  <Option value="users">Utilisateurs</Option>
                  <Option value="clients">Clients</Option>
                  <Option value="products">Produits</Option>
                </Select>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <RangePicker
                  value={filters.date_from && filters.date_to ? [filters.date_from, filters.date_to] : null}
                  onChange={handleDateRangeChange}
                  className="w-full"
                  placeholder={['Date début', 'Date fin']}
                />
              </Col>
            </Row>

            <Row className="mt-4">
              <Col>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    onClick={applyFilters}
                  >
                    Appliquer
                  </Button>
                  <Button 
                    icon={<ClearOutlined />}
                    onClick={clearFilters}
                  >
                    Effacer
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={fetchAuditLogs}
                  >
                    Actualiser
                  </Button>
                  <Button 
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      // TODO: Implement export
                      console.log('Export logs');
                    }}
                  >
                    Exporter
                  </Button>
                </Space>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={auditLogs}
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: loading ? <Spin /> : 'Aucun log d\'audit trouvé'
          }}
        />
        
        <div className="flex justify-end mt-4">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalCount}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} sur ${total} éléments`
            }
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
              }
            }}
            pageSizeOptions={['10', '25', '50', '100']}
          />
        </div>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
