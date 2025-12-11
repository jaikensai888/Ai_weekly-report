const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'ai1-log-secret-key-2024'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

async function main() {
  const prisma = new PrismaClient()
  try {
    let tao = await prisma.user.findUnique({ where: { username: 'tao' } })
    if (!tao) {
      tao = await prisma.user.create({
        data: { username: 'tao', password: hashPassword('123456') }
      })
      console.log('created user tao with id:', tao.id)
    } else {
      console.log('user tao exists with id:', tao.id)
    }

    const [logs, summaries, templates] = await Promise.all([
      prisma.logEntry.updateMany({ where: {}, data: { creatorId: tao.id } }),
      prisma.summary.updateMany({ where: {}, data: { creatorId: tao.id } }),
      prisma.summaryTemplate.updateMany({ where: {}, data: { creatorId: tao.id } })
    ])

    console.log(JSON.stringify({
      success: true,
      userId: tao.id,
      updated: { logs: logs.count, summaries: summaries.count, templates: templates.count }
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
