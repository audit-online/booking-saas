import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkiscmpsggsxpbqkydpw.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_KEY_HERE'; // Replace with your actual service key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const appointments = [
  {
    id: '02b80e27-c53a-4fc5-98e6-5554e4dde8e1',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'sylvie durant',
    client_email: 'pviard83@gmail.com',
    client_phone: '0669370892',
    appointment_date: '2025-10-22',
    appointment_time: '10:00:00',
    duration: 30,
    price: 45.00,
    status: 'completed',
    notes: 'test test',
    created_at: '2025-10-21 12:54:55.682976+00',
    employee_id: null
  },
  {
    id: '04c8308c-03c8-4bf4-89ab-2280bc05a22b',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-23',
    appointment_time: '09:00:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'test',
    created_at: '2025-10-22 07:37:43.190564+00',
    employee_id: null
  },
  {
    id: '06bc1590-57f6-4b12-b0b7-ff62091bb10d',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'dupont robert',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0909090909',
    appointment_date: '2025-10-23',
    appointment_time: '09:30:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'deuxième test',
    created_at: '2025-10-22 07:14:32.36003+00',
    employee_id: null
  },
  {
    id: '122d6cf3-5d1c-4fce-bb37-ea8afbfe6a2c',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'dupont robert',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0909090909',
    appointment_date: '2025-10-23',
    appointment_time: '09:00:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'test test',
    created_at: '2025-10-22 07:17:53.003445+00',
    employee_id: null
  },
  {
    id: '31bfa51f-5fc5-4b7d-8792-498f49087c5e',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-23',
    appointment_time: '09:00:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'test',
    created_at: '2025-10-22 07:03:32.446835+00',
    employee_id: null
  },
  {
    id: '786a1d3d-cdcb-4171-a672-c4ee5b2ab996',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-23',
    appointment_time: '11:00:00',
    duration: 30,
    price: 45.00,
    status: 'confirmed',
    notes: 'test',
    created_at: '2025-10-21 15:40:09.178556+00',
    employee_id: null
  },
  {
    id: '9483e0e6-aade-49ee-bfbe-454629e06890',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-23',
    appointment_time: '11:00:00',
    duration: 30,
    price: 45.00,
    status: 'confirmed',
    notes: 'test test',
    created_at: '2025-10-21 15:36:07.723444+00',
    employee_id: null
  },
  {
    id: 'c4922c33-b8ad-4242-8d16-8aa26d5b0aef',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: 'fbe7f20b-44ce-4f7e-a1df-9f05cd8b209f',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-24',
    appointment_time: '09:30:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'test',
    created_at: '2025-10-22 13:18:35.023061+00',
    employee_id: '04b5686d-a546-4ad6-8ce8-6d00509529d6'
  },
  {
    id: 'd32a812a-16a1-450c-a337-f26639a01d9a',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: 'ad65e925-3e35-49bc-ba94-17f5e65e507b',
    client_name: 'durut pierre',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0101010101',
    appointment_date: '2025-10-23',
    appointment_time: '09:00:00',
    duration: 45,
    price: null,
    status: 'confirmed',
    notes: 'test',
    created_at: '2025-10-22 12:46:20.092399+00',
    employee_id: '1d78ddd4-c44a-4b9b-8613-b473d070a3a3'
  },
  {
    id: 'ffe2a452-c52b-4c83-9f9b-5882410d17b1',
    professional_id: 'ca35a16f-fd1a-453e-9134-d869c2975538',
    service_id: '684f509e-0423-4051-9929-1ae5145e2206',
    client_name: 'dupont robert',
    client_email: 'vendeurstest@gmail.com',
    client_phone: '0909090909',
    appointment_date: '2025-10-23',
    appointment_time: '09:00:00',
    duration: 30,
    price: null,
    status: 'confirmed',
    notes: 'mjkùmjùkj',
    created_at: '2025-10-22 07:21:27.005571+00',
    employee_id: null
  }
];

async function insertAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .upsert(appointments);

  if (error) {
    console.error('Error inserting appointments:', error);
  } else {
    console.log('Appointments inserted successfully:', data);
  }
}

insertAppointments();