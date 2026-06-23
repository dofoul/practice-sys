import { Card, Skeleton, Row, Col } from "antd";

type Variant = "default" | "table" | "detail" | "cards";

export function PageSkeleton({ variant = "default" }: { variant?: Variant }) {
  if (variant === "table") {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 280 }} />
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 240 }} />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card style={{ marginBottom: 16 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
            <Card>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card>
              <Skeleton active paragraph={{ rows: 5 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 280 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 280 }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
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
