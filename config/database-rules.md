# 数据库表构建规范

## 基础字段要求

每个数据表**必须**包含以下字段：

| 字段       | 类型     | 约束         | 默认值       | 说明                       |
| ---------- | -------- | ------------ | ------------ | -------------------------- |
| id         | Int      | PK, 自增     | AUTO         | 主键                       |
| createTime | DateTime | NOT NULL     | now()        | 创建时间                   |
| updateTime | DateTime | NOT NULL     | now()        | 更新时间                   |
| status     | Int      | NOT NULL     | 1            | 状态：0=删除，1=正常       |
| creatorId  | Int      | NOT NULL     | 0            | 创建者ID                   |

## Prisma 模型模板

```prisma
model TableName {
  id         Int      @id @default(autoincrement())
  createTime DateTime @default(now())
  updateTime DateTime @updatedAt
  status     Int      @default(1)
  creatorId  Int      @default(0)
  
  // 业务字段写在这里
}
```

## 命名规范

- 表名：大驼峰（PascalCase），如 `LogEntry`、`UserInfo`
- 字段名：小驼峰（camelCase），如 `createTime`、`creatorId`
- 外键：`关联表名Id`，如 `userId`、`categoryId`

## 状态码定义

| 值 | 含义   |
| -- | ------ |
| 0  | 已删除 |
| 1  | 正常   |

## 注意事项

1. 删除数据使用**软删除**，将 `status` 设为 0
2. 查询时默认过滤 `status = 0` 的记录
3. `updateTime` 使用 `@updatedAt` 自动更新

