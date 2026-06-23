import { Card, Skeleton, Row, Col } from "antd";

export default function DashboardLoading() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 300 }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
