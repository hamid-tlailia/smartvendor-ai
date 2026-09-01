import { useState } from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Chip, Stack } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SendReceiptDialog from '../orders/SendReceiptDialog';

const CHANNEL_ICON = {
  whatsapp: <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />,
  instagram: <InstagramIcon fontSize="small" sx={{ color: '#E1306C' }} />,
  messenger: <FacebookIcon fontSize="small" sx={{ color: '#0866FF' }} />,
  tiktok: <MusicNoteIcon fontSize="small" sx={{ color: '#000000' }} />,
  manual: <EditNoteRoundedIcon fontSize="small" color="action" />,
};

const STATUS_COLOR = {
  open: 'default',
  pending_confirmation: 'warning',
  confirmed: 'success',
  abandoned: 'error',
  cancelled: 'default',
};

const STATUS_LABEL = {
  open: 'مفتوحة',
  pending_confirmation: 'بانتظار التأكيد',
  confirmed: 'مؤكدة',
  abandoned: 'متروكة',
  cancelled: 'ملغاة',
};

export default function OrdersTable({ orders, loading }) {
  const [receiptTarget, setReceiptTarget] = useState(null);

  const columns = [
    {
      field: 'channel',
      headerName: 'القناة',
      width: 90,
      renderCell: (params) => (
        <Stack alignItems="center" height="100%" justifyContent="center">
          {CHANNEL_ICON[params.value] ?? params.value}
        </Stack>
      ),
    },
    { field: 'customer_name', headerName: 'العميل', flex: 1, minWidth: 140 },
    { field: 'customer_city', headerName: 'المدينة', width: 120 },
    {
      field: 'total',
      headerName: 'الإجمالي',
      width: 130,
      valueFormatter: (params) => `${Number(params.value ?? 0).toLocaleString('ar-DZ')} ${params.api.getRow(params.id)?.currency ?? ''}`,
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 150,
      renderCell: (params) => (
        <Chip size="small" label={STATUS_LABEL[params.value] ?? params.value} color={STATUS_COLOR[params.value] ?? 'default'} variant="outlined" />
      ),
    },
    {
      field: 'created_at',
      headerName: 'التاريخ',
      width: 170,
      valueFormatter: (params) => new Date(params.value).toLocaleString('ar-DZ'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'إجراءات',
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem
          key="send-receipt"
          icon={<SendRoundedIcon fontSize="small" />}
          label="إرسال الإيصال"
          showInMenu={false}
          onClick={() => setReceiptTarget(params.row)}
        />,
      ],
    },
  ];

  return (
    <>
      <DataGrid
        autoHeight
        rows={orders}
        columns={columns}
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 'none' }}
      />
      <SendReceiptDialog open={Boolean(receiptTarget)} order={receiptTarget} onClose={() => setReceiptTarget(null)} />
    </>
  );
}

OrdersTable.propTypes = {
  orders: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

OrdersTable.defaultProps = { loading: false };
