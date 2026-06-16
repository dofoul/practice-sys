"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  App,
  Card,
  Descriptions,
  Typography,
  Space,
  Button,
  Timeline,
  Tag,
  Upload,
  Modal,
  Form,
  Input,
  Select,
  Breadcrumb,
  Alert,
  Spin,
  Tooltip,
  Row,
  Col,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  DownloadOutlined,
  SendOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PracticeStatusTag } from "@/components/ui/PracticeStatusTag";
import { DocumentStatusTag } from "@/components/ui/DocumentStatusTag";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface Document {
  id: number;
  status: string;
  originalName?: string;
  reviewComment?: string;
  documentType: { name: string };
  createdAt: string;
}

interface Review {
  id: number;
  oldStatus: string;
  newStatus: string;
  comment?: string;
  createdAt: string;
  curator: { user: { fullName: string } };
}

interface Practice {
  id: number;
  status: string;
  grade?: string;
  customPlace?: string;
  dateStart?: string;
  dateEnd?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  student: { user: { fullName: string; email: string }; group: { name: string }; recordBookNo?: string };
  practiceType: { name: string };
  period: { name: string; dateStart: string; dateEnd: string };
  offer?: { title: string; company: { name: string; address?: string; contactPerson?: string } };
  documents: Document[];
  reviews: Review[];
}

export default function PracticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { message } = App.useApp();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form] = Form.useForm();
  const [gradeForm] = Form.useForm();

  const role = session?.user?.role;
  const id = params.id as string;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/practices/${id}`);
      if (!res.ok) throw new Error();
      setPractice(await res.json());
    } catch {
      setError("Не удалось загрузить данные практики");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSubmit() {
    if (!confirm("Отправить практику на проверку?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practices/${id}/submit`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Практика отправлена на проверку");
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReview(values: { status: string; comment?: string }) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practices/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Статус обновлён");
      setReviewModal(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGrade(values: { grade: string; comment?: string }) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/practices/${id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Оценка выставлена");
      setGradeModal(false);
      gradeForm.resetFields();
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDocumentReview(docId: number, status: "accepted" | "rejected", comment?: string) {
    try {
      const res = await fetch(`/api/documents/${docId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success(status === "accepted" ? "Документ принят" : "Документ отклонён");
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function handleDownload(docId: number) {
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      message.error("Ошибка получения ссылки на файл");
    }
  }

  async function handleDeleteDocument(docId: number) {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      message.success("Документ удалён");
      load();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (error || !practice) return <Alert type="error" message={error ?? "Данные не найдены"} />;

  const canSubmit = role === "student" && (practice.status === "draft" || practice.status === "needs_revision");
  const canReview = (role === "curator" || role === "admin") && practice.status === "submitted";
  const canGrade = (role === "curator" || role === "admin") && practice.status === "approved";

  const place = practice.offer
    ? `${practice.offer.company.name} — ${practice.offer.title}`
    : practice.customPlace ?? "Не указано";

  return (
    <Space direction="vertical" size={24} style={{ width: "100%", display: "flex" }}>
      <div>
        <Breadcrumb
          items={[
            { title: <Link href="/practices">Практики</Link> },
            { title: "Детали практики" },
          ]}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {practice.student.user.fullName}
              </Title>
              <Space size={8} style={{ marginTop: 4 }}>
                <PracticeStatusTag status={practice.status} />
                {practice.grade && <Tag color="green">Оценка: {practice.grade}</Tag>}
              </Space>
            </div>
          </div>
          <Space size={8}>
            {canSubmit && (
              <Button type="primary" icon={<SendOutlined />} loading={actionLoading} onClick={handleSubmit}>
                Отправить на проверку
              </Button>
            )}
            {canReview && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setReviewModal(true)}>
                Проверить
              </Button>
            )}
            {canGrade && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => setGradeModal(true)}>
                Выставить оценку
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 600 }}>Информация о практике</span>}>
            <Descriptions column={1} labelStyle={{ color: "#64748B", width: 160 }}>
              <Descriptions.Item label="Студент">{practice.student.user.fullName}</Descriptions.Item>
              <Descriptions.Item label="Группа">{practice.student.group.name}</Descriptions.Item>
              {practice.student.recordBookNo && (
                <Descriptions.Item label="Зачётная книжка">{practice.student.recordBookNo}</Descriptions.Item>
              )}
              <Descriptions.Item label="Тип практики">{practice.practiceType.name}</Descriptions.Item>
              <Descriptions.Item label="Период">{practice.period.name}</Descriptions.Item>
              <Descriptions.Item label="Место практики">{place}</Descriptions.Item>
              {practice.dateStart && (
                <Descriptions.Item label="Начало">
                  {dayjs(practice.dateStart).format("DD.MM.YYYY")}
                </Descriptions.Item>
              )}
              {practice.dateEnd && (
                <Descriptions.Item label="Окончание">
                  {dayjs(practice.dateEnd).format("DD.MM.YYYY")}
                </Descriptions.Item>
              )}
              {practice.grade && (
                <Descriptions.Item label="Итоговая оценка">
                  <Tag color="green" style={{ fontWeight: 600, fontSize: 14 }}>{practice.grade}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card
            title={<span style={{ fontWeight: 600 }}>Документы</span>}
            style={{ marginTop: 24 }}
          >
            {practice.documents.length === 0 ? (
              <Alert type="info" message="Документы ещё не загружены" />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                {practice.documents.map((doc) => (
                  <Card
                    key={doc.id}
                    size="small"
                    style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{doc.documentType.name}</Text>
                        {doc.originalName && (
                          <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            {doc.originalName}
                          </Text>
                        )}
                        {doc.reviewComment && (
                          <Text style={{ color: "#DC2626", fontSize: 12, display: "block" }}>
                            Комментарий: {doc.reviewComment}
                          </Text>
                        )}
                      </div>
                      <Space size={8}>
                        <DocumentStatusTag status={doc.status} />
                        <Tooltip title="Скачать">
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(doc.id)}
                          />
                        </Tooltip>
                        {role === "student" &&
                          doc.status !== "accepted" &&
                          (practice.status === "draft" || practice.status === "needs_revision") && (
                            <Popconfirm
                              title="Удалить документ?"
                              description="Файл будет удалён безвозвратно"
                              okText="Удалить"
                              okButtonProps={{ danger: true }}
                              cancelText="Отмена"
                              onConfirm={() => handleDeleteDocument(doc.id)}
                            >
                              <Tooltip title="Удалить">
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Tooltip>
                            </Popconfirm>
                          )}
                        {(role === "curator" || role === "admin") && doc.status !== "accepted" && (
                          <>
                            <Tooltip title="Принять">
                              <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => handleDocumentReview(doc.id, "accepted")}
                              />
                            </Tooltip>
                            <Tooltip title="Отклонить">
                              <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                  Modal.confirm({
                                    title: "Отклонить документ?",
                                    content: (
                                      <Input.TextArea
                                        id="doc-comment"
                                        placeholder="Комментарий (причина отклонения)"
                                        rows={3}
                                        style={{ marginTop: 12 }}
                                      />
                                    ),
                                    okText: "Отклонить",
                                    okButtonProps: { danger: true },
                                    onOk() {
                                      const comment = (document.getElementById("doc-comment") as HTMLTextAreaElement)?.value;
                                      handleDocumentReview(doc.id, "rejected", comment);
                                    },
                                  });
                                }}
                              />
                            </Tooltip>
                          </>
                        )}
                      </Space>
                    </div>
                  </Card>
                ))}
              </Space>
            )}

            {role === "student" && (practice.status === "draft" || practice.status === "needs_revision") && (
              <div style={{ marginTop: 16 }}>
                <Upload
                  customRequest={async ({ file, onSuccess, onError }) => {
                    try {
                      const f = file as File;
                      const res = await fetch(`/api/practices/${id}/documents`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName: f.name, contentType: f.type, documentTypeCode: "report" }),
                      });
                      const { uploadUrl, document: doc } = await res.json();
                      await fetch(uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type } });
                      message.success("Документ загружен");
                      load();
                      onSuccess?.({}, new XMLHttpRequest());
                    } catch {
                      onError?.(new Error("Ошибка загрузки"));
                    }
                  }}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>Загрузить документ</Button>
                </Upload>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  PDF, DOC, DOCX, JPG, PNG — до 10 МБ
                </Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 600 }}>История проверок</span>}>
            {practice.reviews.length === 0 ? (
              <Text type="secondary">История пуста</Text>
            ) : (
              <Timeline
                items={practice.reviews.map((review) => ({
                  color:
                    review.newStatus === "approved" || review.newStatus === "completed"
                      ? "green"
                      : review.newStatus === "rejected"
                        ? "red"
                        : review.newStatus === "needs_revision"
                          ? "orange"
                          : "blue",
                  children: (
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <PracticeStatusTag status={review.newStatus} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(review.createdAt).format("DD.MM.YYYY HH:mm")}
                        </Text>
                      </div>
                      <Text style={{ fontSize: 13, color: "#0F172A" }}>
                        {review.curator.user.fullName}
                      </Text>
                      {review.comment && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: "8px 12px",
                            background: "#F8FAFC",
                            borderRadius: 6,
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>{review.comment}</Text>
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Проверить практику"
        open={reviewModal}
        onCancel={() => { setReviewModal(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item
            label="Решение"
            name="status"
            rules={[{ required: true, message: "Выберите решение" }]}
          >
            <Select
              options={[
                { label: "Принять", value: "approved" },
                { label: "Вернуть на доработку", value: "needs_revision" },
                { label: "Отклонить", value: "rejected" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={3} placeholder="Комментарий для студента..." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setReviewModal(false); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>Применить</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Выставить итоговую оценку"
        open={gradeModal}
        onCancel={() => { setGradeModal(false); gradeForm.resetFields(); }}
        footer={null}
      >
        <Form form={gradeForm} layout="vertical" onFinish={handleGrade}>
          <Form.Item
            label="Оценка"
            name="grade"
            rules={[{ required: true, message: "Введите оценку" }]}
          >
            <Select
              options={[
                { label: "Отлично (5)", value: "5" },
                { label: "Хорошо (4)", value: "4" },
                { label: "Удовлетворительно (3)", value: "3" },
                { label: "Зачтено", value: "Зачтено" },
                { label: "Не зачтено", value: "Не зачтено" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={3} placeholder="Итоговый комментарий..." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setGradeModal(false); gradeForm.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>Завершить практику</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
