"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Input,
  InputNumber,
  Select,
  Tag,
  Empty,
  Alert,
  Spin,
  Badge,
  Modal,
  Form,
  Divider,
  App,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  BookOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const { Title, Text, Paragraph } = Typography;

interface Offer {
  id: number;
  title: string;
  description?: string;
  slotsTotal: number;
  slotsTaken: number;
  isPublished: boolean;
  company: { name: string; address?: string };
  practiceType: { name: string };
  period: { name: string; dateStart: string; dateEnd: string };
}

interface Period { id: number; name: string }
interface PracticeType { id: number; name: string }

export default function CatalogPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<number | undefined>();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [newCompanyModal, setNewCompanyModal] = useState(false);
  const [newCompanyForm] = Form.useForm();
  const [newCompanyLoading, setNewCompanyLoading] = useState(false);

  const [newTypeModal, setNewTypeModal] = useState(false);
  const [newTypeForm] = Form.useForm();
  const [newTypeLoading, setNewTypeLoading] = useState(false);

  const [newPeriodModal, setNewPeriodModal] = useState(false);
  const [newPeriodForm] = Form.useForm();
  const [newPeriodLoading, setNewPeriodLoading] = useState(false);

  const role = session?.user?.role;
  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(periodFilter ? { periodId: String(periodFilter) } : {}),
        ...(typeFilter ? { typeId: String(typeFilter) } : {}),
      });
      const res = await fetch(`/api/offers?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOffers(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить каталог");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, periodFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/periods").then((r) => r.json()).then((d) => setPeriods(d.items || []));
    fetch("/api/admin/dictionaries/practice-types").then((r) => r.json()).then((d) => setPracticeTypes(d || []));
    fetch("/api/admin/dictionaries/companies").then((r) => r.json()).then((d) => setCompanies(d || []));
  }, []);

  async function handleApply(offerId: number) {
    const periodId = offers.find((o) => o.id === offerId)?.period;
    try {
      const typesRes = await fetch("/api/admin/dictionaries/practice-types");
      const types = await typesRes.json();
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return;

      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          practiceTypeId: types.find((t: PracticeType) => t.name === offer.practiceType.name)?.id,
          periodId: periods.find((p) => p.name === offer.period.name)?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success("Место практики выбрано! Переход к заполнению документов...");
      router.push(`/practices/${data.id}`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function handleCreate(values: {
    companyId: number;
    practiceTypeId: number;
    periodId: number;
    title: string;
    description?: string;
    slotsTotal: number;
  }) {
    setCreateLoading(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Предложение добавлено в каталог");
      setCreateModal(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCreateCompany(values: {
    name: string; inn?: string; address?: string; contactPerson?: string; contactPhone?: string;
  }) {
    setNewCompanyLoading(true);
    try {
      const res = await fetch("/api/admin/dictionaries/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      setCompanies((prev) => [...prev, { id: created.id, name: created.name }]);
      form.setFieldValue("companyId", created.id);
      message.success(`Предприятие "${created.name}" добавлено`);
      setNewCompanyModal(false);
      newCompanyForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setNewCompanyLoading(false);
    }
  }

  async function handleCreatePracticeType(values: { code: string; name: string }) {
    setNewTypeLoading(true);
    try {
      const res = await fetch("/api/admin/dictionaries/practice-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      setPracticeTypes((prev) => [...prev, { id: created.id, name: created.name }]);
      form.setFieldValue("practiceTypeId", created.id);
      message.success(`Тип "${created.name}" добавлен`);
      setNewTypeModal(false);
      newTypeForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setNewTypeLoading(false);
    }
  }

  async function handleCreatePeriod(values: { name: string; dateStart: string; dateEnd: string }) {
    setNewPeriodLoading(true);
    try {
      const res = await fetch("/api/admin/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      setPeriods((prev) => [...prev, { id: created.id, name: created.name }]);
      form.setFieldValue("periodId", created.id);
      message.success(`Период "${created.name}" добавлен`);
      setNewPeriodModal(false);
      newPeriodForm.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setNewPeriodLoading(false);
    }
  }

  const slotsLeft = (offer: Offer) => offer.slotsTotal - offer.slotsTaken;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Каталог мест практики</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Доступные предложения от предприятий — {total}
          </Text>
        </div>
        {(role === "curator" || role === "admin") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            Добавить предложение
          </Button>
        )}
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card>
        <Space size={8} style={{ flexWrap: "wrap" }}>
          <Input
            placeholder="Поиск по названию, предприятию..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Тип практики"
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            allowClear
            style={{ width: 200 }}
            options={practiceTypes.map((t) => ({ label: t.name, value: t.id }))}
          />
          <Select
            placeholder="Период"
            value={periodFilter}
            onChange={(v) => { setPeriodFilter(v); setPage(1); }}
            allowClear
            style={{ width: 220 }}
            options={periods.map((p) => ({ label: p.name, value: p.id }))}
          />
          <Select
            placeholder="Наличие мест"
            onChange={(v) => setPage(1)}
            allowClear
            style={{ width: 160 }}
            options={[{ label: "Есть места", value: "available" }]}
          />
        </Space>
      </Card>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <Empty description="Предложения не найдены" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {offers.map((offer) => {
            const left = slotsLeft(offer);
            const hasSlots = left > 0;
            return (
              <Col key={offer.id} xs={24} sm={12} xl={8}>
                <Card
                  hoverable={hasSlots}
                  style={{
                    height: "100%",
                    border: hasSlots ? "1px solid #E2E8F0" : "1px solid #FCA5A5",
                    opacity: hasSlots ? 1 : 0.7,
                  }}
                  actions={[
                    <Link key="detail" href={`/catalog/${offer.id}`}>
                      <Button type="text" size="small">Подробнее</Button>
                    </Link>,
                    role === "student" && hasSlots ? (
                      <Button
                        key="apply"
                        type="primary"
                        size="small"
                        onClick={() => handleApply(offer.id)}
                      >
                        Выбрать
                      </Button>
                    ) : <span key="na" />,
                  ]}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue" style={{ marginBottom: 4 }}>{offer.practiceType.name}</Tag>
                    <Badge
                      status={hasSlots ? "success" : "error"}
                      text={
                        <Text style={{ fontSize: 12, color: hasSlots ? "#16A34A" : "#DC2626" }}>
                          {hasSlots ? `Мест: ${left} из ${offer.slotsTotal}` : "Мест нет"}
                        </Text>
                      }
                    />
                  </div>

                  <Title level={5} style={{ margin: "8px 0 4px", fontSize: 14 }}>
                    {offer.title}
                  </Title>

                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Text style={{ fontSize: 13, color: "#0F172A" }}>
                      <EnvironmentOutlined style={{ color: "#64748B", marginRight: 6 }} />
                      {offer.company.name}
                    </Text>
                    {offer.company.address && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {offer.company.address}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <BookOutlined style={{ marginRight: 6 }} />
                      {offer.period.name}
                    </Text>
                  </Space>

                  {offer.description && (
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 13, color: "#64748B", marginTop: 8, marginBottom: 0 }}
                    >
                      {offer.description}
                    </Paragraph>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {total > pageSize && (
        <div style={{ textAlign: "center" }}>
          <Button onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= total}>
            Загрузить ещё
          </Button>
        </div>
      )}

      <Modal
        title="Добавить предложение в каталог"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item label="Предприятие" name="companyId" rules={[{ required: true, message: "Выберите предприятие" }]}>
            <Select
              options={companies.map((c) => ({ label: c.name, value: c.id }))}
              showSearch
              optionFilterProp="label"
              placeholder="Выберите или создайте новое"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: "8px", borderTop: "1px solid #E2E8F0" }}>
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => setNewCompanyModal(true)}
                    >
                      Создать новое предприятие
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item label="Тип практики" name="practiceTypeId" rules={[{ required: true, message: "Выберите тип" }]}>
            <Select
              options={practiceTypes.map((t) => ({ label: t.name, value: t.id }))}
              placeholder="Выберите или создайте новый"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={() => setNewTypeModal(true)}>
                      Создать новый тип практики
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item label="Период" name="periodId" rules={[{ required: true, message: "Выберите период" }]}>
            <Select
              options={periods.map((p) => ({ label: p.name, value: p.id }))}
              placeholder="Выберите или создайте новый"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={() => setNewPeriodModal(true)}>
                      Создать новый период
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item label="Заголовок" name="title" rules={[{ required: true, message: "Введите заголовок" }]}>
            <Input placeholder="Разработчик веб-приложений" />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} placeholder="Описание стажировки, требования..." />
          </Form.Item>
          <Form.Item label="Количество мест" name="slotsTotal" rules={[{ required: true, message: "Укажите количество" }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setCreateModal(false); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>Добавить</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Модал создания нового предприятия */}
      <Modal
        title="Новое предприятие"
        open={newCompanyModal}
        onCancel={() => { setNewCompanyModal(false); newCompanyForm.resetFields(); }}
        footer={null}
        width={480}
        zIndex={1100}
      >
        <Form form={newCompanyForm} layout="vertical" onFinish={handleCreateCompany} style={{ marginTop: 16 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder='ООО "ТехСпорт"' />
          </Form.Item>
          <Form.Item label="ИНН" name="inn">
            <Input placeholder="7712345678" />
          </Form.Item>
          <Form.Item label="Адрес" name="address">
            <Input placeholder="г. Москва, ул. Примерная, д. 1" />
          </Form.Item>
          <Form.Item label="Контактное лицо" name="contactPerson">
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item label="Телефон" name="contactPhone">
            <Input placeholder="+7 (495) 000-00-00" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setNewCompanyModal(false); newCompanyForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={newCompanyLoading}>Создать</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Модал создания типа практики */}
      <Modal
        title="Новый тип практики"
        open={newTypeModal}
        onCancel={() => { setNewTypeModal(false); newTypeForm.resetFields(); }}
        footer={null}
        destroyOnClose
        zIndex={1100}
      >
        <Form form={newTypeForm} layout="vertical" onFinish={handleCreatePracticeType} style={{ marginTop: 16 }}>
          <Form.Item label="Код" name="code" rules={[{ required: true, message: "Введите код" }]}>
            <Input placeholder="production" />
          </Form.Item>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Производственная практика" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setNewTypeModal(false); newTypeForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={newTypeLoading}>Создать</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Модал создания периода */}
      <Modal
        title="Новый период практики"
        open={newPeriodModal}
        onCancel={() => { setNewPeriodModal(false); newPeriodForm.resetFields(); }}
        footer={null}
        destroyOnClose
        zIndex={1100}
      >
        <Form form={newPeriodForm} layout="vertical" onFinish={handleCreatePeriod} style={{ marginTop: 16 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Лето 2025" />
          </Form.Item>
          <Form.Item label="Дата начала" name="dateStart" rules={[{ required: true, message: "Укажите дату" }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Дата окончания" name="dateEnd" rules={[{ required: true, message: "Укажите дату" }]}>
            <Input type="date" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setNewPeriodModal(false); newPeriodForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={newPeriodLoading}>Создать</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
