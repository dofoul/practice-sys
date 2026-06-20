"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Typography, Button, Tag, Space, Modal, Form, Input,
  Select, InputNumber, Switch, Drawer, App, Popconfirm, Upload,
  Tooltip, Empty, Alert, Spin,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined,
  UploadOutlined, FileOutlined, StarOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";

const { Title, Text } = Typography;

interface Offer {
  id: number;
  title: string;
  direction?: string;
  slotsTotal: number;
  slotsTaken: number;
  isPublished: boolean;
  avgRating: number | null;
  reviewCount: number;
  practicesCount: number;
  practiceType: { name: string };
  period: { name: string; dateStart: string; dateEnd: string };
  templates: { id: number; documentType: { id: number; name: string } }[];
}

interface Applicant {
  id: number;
  status: string;
  student: { user: { fullName: string; email: string; phone?: string }; group: { name: string } };
  period: { name: string };
  createdAt: string;
}

interface PracticeType { id: number; name: string }
interface Period { id: number; name: string }
interface DocType { id: number; name: string }

const DIRECTIONS = ["IT", "Экономика", "Юриспруденция", "Менеджмент", "Маркетинг", "Медицина", "Педагогика", "Другое"];

export default function CompanyOffersPage() {
  const { message } = App.useApp();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);

  const [offerModal, setOfferModal] = useState<{ open: boolean; editing: Offer | null }>({ open: false, editing: null });
  const [offerForm] = Form.useForm();
  const [offerSaving, setOfferSaving] = useState(false);

  const [applicantsDrawer, setApplicantsDrawer] = useState<{ open: boolean; offerId: number | null; title: string }>({
    open: false, offerId: null, title: "",
  });
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const [templatesDrawer, setTemplatesDrawer] = useState<{ open: boolean; offer: Offer | null }>({
    open: false, offer: null,
  });
  const [templateDocType, setTemplateDocType] = useState<number | null>(null);
  const [templateFile, setTemplateFile] = useState<UploadFile | null>(null);
  const [templateUploading, setTemplateUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offersRes, typesRes, periodsRes, docTypesRes] = await Promise.all([
        fetch("/api/company/offers"),
        fetch("/api/admin/dictionaries/practice-types"),
        fetch("/api/admin/periods"),
        fetch("/api/admin/dictionaries/document-types"),
      ]);
      if (offersRes.ok) setOffers(await offersRes.json());
      if (typesRes.ok) setPracticeTypes(await typesRes.json());
      if (periodsRes.ok) {
        const d = await periodsRes.json();
        setPeriods(d.items ?? d);
      }
      if (docTypesRes.ok) setDocTypes(await docTypesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    offerForm.resetFields();
    offerForm.setFieldValue("isPublished", false);
    setOfferModal({ open: true, editing: null });
  }

  function openEdit(offer: Offer) {
    offerForm.setFieldsValue({
      practiceTypeId: practiceTypes.find((t) => t.name === offer.practiceType.name)?.id,
      periodId: periods.find((p) => p.name === offer.period.name)?.id,
      title: offer.title,
      description: undefined,
      direction: offer.direction,
      slotsTotal: offer.slotsTotal,
      isPublished: offer.isPublished,
    });
    setOfferModal({ open: true, editing: offer });
  }

  async function saveOffer(values: Record<string, unknown>) {
    setOfferSaving(true);
    try {
      const url = offerModal.editing ? `/api/company/offers/${offerModal.editing.id}` : "/api/company/offers";
      const method = offerModal.editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await res.json();
      if (!res.ok) { message.error(data.error); return; }
      message.success(offerModal.editing ? "Вакансия обновлена" : "Вакансия создана");
      setOfferModal({ open: false, editing: null });
      load();
    } finally {
      setOfferSaving(false);
    }
  }

  async function deleteOffer(id: number) {
    const res = await fetch(`/api/company/offers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { message.error(data.error); return; }
    message.success("Вакансия удалена");
    load();
  }

  async function openApplicants(offer: Offer) {
    setApplicantsDrawer({ open: true, offerId: offer.id, title: offer.title });
    setApplicantsLoading(true);
    try {
      const res = await fetch(`/api/company/offers/${offer.id}/applicants`);
      if (res.ok) setApplicants(await res.json());
    } finally {
      setApplicantsLoading(false);
    }
  }

  function openTemplates(offer: Offer) {
    setTemplatesDrawer({ open: true, offer });
    setTemplateDocType(null);
    setTemplateFile(null);
  }

  function refreshTemplatesOffer(offerId: number, updatedOffer: Offer) {
    setOffers((prev) => prev.map((o) => (o.id === offerId ? updatedOffer : o)));
    setTemplatesDrawer((prev) => ({ ...prev, offer: updatedOffer }));
  }

  async function uploadTemplate() {
    if (!templateDocType || !templateFile || !templatesDrawer.offer) return;
    const file = templateFile.originFileObj;
    if (!file) return;
    setTemplateUploading(true);
    try {
      const presignRes = await fetch(`/api/company/offers/${templatesDrawer.offer.id}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentTypeId: templateDocType, fileName: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) { message.error(presignData.error); return; }

      await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      message.success("Шаблон загружен");
      setTemplateDocType(null);
      setTemplateFile(null);
      const offersRes = await fetch("/api/company/offers");
      if (offersRes.ok) {
        const updated = await offersRes.json() as Offer[];
        const updatedOffer = updated.find((o) => o.id === templatesDrawer.offer!.id);
        if (updatedOffer) refreshTemplatesOffer(templatesDrawer.offer.id, updatedOffer);
        setOffers(updated);
      }
    } finally {
      setTemplateUploading(false);
    }
  }

  async function deleteTemplate(templateId: number) {
    if (!templatesDrawer.offer) return;
    const res = await fetch(`/api/company/offers/${templatesDrawer.offer.id}/templates/${templateId}`, { method: "DELETE" });
    if (!res.ok) { message.error("Ошибка удаления"); return; }
    message.success("Шаблон удалён");
    const offersRes = await fetch("/api/company/offers");
    if (offersRes.ok) {
      const updated = await offersRes.json() as Offer[];
      const updatedOffer = updated.find((o) => o.id === templatesDrawer.offer!.id);
      if (updatedOffer) refreshTemplatesOffer(templatesDrawer.offer.id, updatedOffer);
      setOffers(updated);
    }
  }

  const columns = [
    {
      title: "Вакансия",
      key: "title",
      render: (o: Offer) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 14 }}>{o.title}</Text>
          <Space size={4}>
            {o.direction && <Tag color="purple" style={{ fontSize: 11 }}>{o.direction}</Tag>}
            {o.avgRating && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                <StarOutlined style={{ color: "#D97706" }} /> {o.avgRating} ({o.reviewCount})
              </Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Тип / Период",
      key: "type",
      render: (o: Offer) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 13 }}>{o.practiceType.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{o.period.name}</Text>
        </Space>
      ),
    },
    {
      title: "Места",
      key: "slots",
      width: 90,
      render: (o: Offer) => (
        <Text style={{ fontSize: 13 }}>
          {o.slotsTaken}/{o.slotsTotal}
        </Text>
      ),
    },
    {
      title: "Статус",
      key: "status",
      width: 110,
      render: (o: Offer) => (
        <Tag color={o.isPublished ? "green" : "default"}>
          {o.isPublished ? "Опубликовано" : "Черновик"}
        </Tag>
      ),
    },
    {
      title: "Документы",
      key: "templates",
      width: 110,
      render: (o: Offer) => (
        <Tooltip title="Шаблоны документов для студентов">
          <Button size="small" icon={<FileOutlined />} onClick={() => openTemplates(o)}>
            {o.templates.length === 0 ? "Загрузить" : `${o.templates.length} шаблон.`}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Отклики",
      key: "applicants",
      width: 100,
      render: (o: Offer) => (
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={() => openApplicants(o)}
        >
          {o.practicesCount}
        </Button>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (o: Offer) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(o)} />
          </Tooltip>
          <Popconfirm
            title="Удалить вакансию?"
            description={o.slotsTaken > 0 ? "На вакансию записаны студенты" : "Это действие нельзя отменить"}
            onConfirm={() => deleteOffer(o.id)}
            okText="Удалить"
            cancelText="Отмена"
            disabled={o.slotsTaken > 0}
          >
            <Tooltip title={o.slotsTaken > 0 ? "Нельзя удалить: есть студенты" : "Удалить"}>
              <Button size="small" icon={<DeleteOutlined />} danger disabled={o.slotsTaken > 0} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Мои вакансии</Title>
          <Text type="secondary">Управление местами практики для студентов</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Создать вакансию
        </Button>
      </div>

      <Card>
        <Table
          dataSource={offers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="Вакансий пока нет. Создайте первую!" /> }}
          scroll={{ x: 700 }}
        />
      </Card>

      {/* Offer create/edit modal */}
      <Modal
        title={offerModal.editing ? "Редактировать вакансию" : "Новая вакансия"}
        open={offerModal.open}
        onCancel={() => setOfferModal({ open: false, editing: null })}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form layout="vertical" form={offerForm} onFinish={saveOffer} style={{ marginTop: 16 }}>
          <Form.Item label="Название вакансии" name="title" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Frontend-разработчик (React)" />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} placeholder="Чем будет заниматься студент, стек технологий, условия..." maxLength={2000} showCount />
          </Form.Item>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item label="Тип практики" name="practiceTypeId" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите тип" options={practiceTypes.map((t) => ({ value: t.id, label: t.name }))} />
            </Form.Item>
            <Form.Item label="Период" name="periodId" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите период" options={periods.map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item label="Направление" name="direction" style={{ flex: 1 }}>
              <Select placeholder="Выберите направление" allowClear options={DIRECTIONS.map((d) => ({ value: d, label: d }))} />
            </Form.Item>
            <Form.Item label="Мест всего" name="slotsTotal" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} max={100} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item label="Опубликовать" name="isPublished" valuePropName="checked">
            <Switch checkedChildren="Да" unCheckedChildren="Нет" />
          </Form.Item>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => setOfferModal({ open: false, editing: null })}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={offerSaving}>
              {offerModal.editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Applicants drawer */}
      <Drawer
        title={<><TeamOutlined /> Отклики — {applicantsDrawer.title}</>}
        open={applicantsDrawer.open}
        onClose={() => setApplicantsDrawer({ open: false, offerId: null, title: "" })}
        width={600}
      >
        {applicantsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}><Spin /></div>
        ) : applicants.length === 0 ? (
          <Empty description="Студентов ещё нет" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {applicants.map((a) => (
              <Card key={a.id} size="small" style={{ borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Text strong>{a.student.user.fullName}</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 13 }}>
                      {a.student.group.name} • {a.student.user.email}
                    </Text>
                    {a.student.user.phone && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{a.student.user.phone}</Text>
                    )}
                  </div>
                  <PracticeStatusTag status={a.status} />
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                  Записан: {dayjs(a.createdAt).format("DD.MM.YYYY")}
                </Text>
              </Card>
            ))}
          </Space>
        )}
      </Drawer>

      {/* Templates drawer */}
      <Drawer
        title={<><FileOutlined /> Шаблоны документов — {templatesDrawer.offer?.title}</>}
        open={templatesDrawer.open}
        onClose={() => setTemplatesDrawer({ open: false, offer: null })}
        width={520}
      >
        <Alert
          type="info"
          showIcon
          message="Загружайте шаблоны документов, которые вы предоставляете студентам (договор, аттестационный лист и т.д.). Студенты смогут скачать их со страницы вакансии."
          style={{ marginBottom: 20 }}
        />

        {/* Existing templates */}
        {templatesDrawer.offer?.templates && templatesDrawer.offer.templates.length > 0 && (
          <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 20 }}>
            {templatesDrawer.offer.templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                }}
              >
                <Space>
                  <FileOutlined style={{ color: "#2563EB" }} />
                  <Text style={{ fontSize: 14 }}>{t.documentType.name}</Text>
                </Space>
                <Popconfirm title="Удалить шаблон?" onConfirm={() => deleteTemplate(t.id)} okText="Удалить" cancelText="Нет">
                  <Button size="small" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </div>
            ))}
          </Space>
        )}

        {/* Upload new template */}
        <Card size="small" title="Добавить шаблон" style={{ borderRadius: 8 }}>
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <div>
              <Text style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Тип документа</Text>
              <Select
                placeholder="Выберите тип документа"
                style={{ width: "100%" }}
                value={templateDocType}
                onChange={setTemplateDocType}
                options={docTypes.map((d) => ({ value: d.id, label: d.name }))}
              />
            </div>
            <div>
              <Text style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Файл (PDF, DOC, DOCX)</Text>
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                accept=".pdf,.doc,.docx"
                fileList={templateFile ? [templateFile] : []}
                onChange={({ fileList }) => setTemplateFile(fileList.length > 0 ? fileList[fileList.length - 1] : null)}
              >
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>Выбрать файл</Button>
              </Upload>
            </div>
            <Button
              type="primary"
              block
              loading={templateUploading}
              disabled={!templateDocType || !templateFile}
              onClick={uploadTemplate}
            >
              Загрузить шаблон
            </Button>
          </Space>
        </Card>
      </Drawer>
    </Space>
  );
}
