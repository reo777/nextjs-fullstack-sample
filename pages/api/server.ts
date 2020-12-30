import {makeSchema, objectType, stringArg} from '@nexus/schema';
import {PrismaClient} from '@prisma/client';
import {ApolloServer} from 'apollo-server-micro';
import path from 'path';

const prisma = new PrismaClient();

const User = objectType({
  name: 'User',
  definition(t) {
    t.int('id');
    t.string('name');
    t.string('email');
    t.list.field('posts', {
      type: 'Post',
      resolve: (parent) =>
        prisma.user
          .findUnique({
            where: {id: Number(parent.id)},
          })
          .posts(),
    });
  },
});

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.int('id');
    t.string('title');
    t.string('content', {});
    t.boolean('published');
    t.field('author', {
      type: 'User',

      resolve: (parent) =>
        prisma.post
          .findUnique({
            where: {id: Number(parent.id)},
          })
          .author(),
    });
  },
});

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.field('post', {
      type: 'Post',
      args: {
        postId: stringArg(),
      },
      resolve: (_, args) => {
        return prisma.post.findOne({
          where: {id: Number(args.postId)},
        });
      },
    });

    t.list.field('feed', {
      type: 'Post',
      resolve: (_parent, _args, ctx) => {
        return prisma.post.findMany({
          where: {published: true},
        });
      },
    });

    t.list.field('drafts', {
      type: 'Post',
      resolve: (_parent, _args, ctx) => {
        return prisma.post.findMany({
          where: {published: false},
        });
      },
    });

    t.list.field('filterPosts', {
      type: 'Post',
      args: {
        searchString: stringArg(),
      },
      resolve: (_, {searchString}, ctx) => {
        return prisma.post.findMany({
          where: {
            OR: [
              {title: {contains: searchString}},
              {content: {contains: searchString}},
            ],
          },
        });
      },
    });
  },
});

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signupUser', {
      type: 'User',
      args: {
        name: stringArg(),
        email: stringArg(),
        password: stringArg(),
      },
      resolve: (_, {name, email, password}, ctx) => {
        return prisma.user.create({
          data: {
            name,
            email,
            password,
          },
        });
      },
    });

    t.field('deletePost', {
      type: 'Post',

      args: {
        postId: stringArg(),
      },
      resolve: (_, {postId}, ctx) => {
        return prisma.post.delete({
          where: {id: Number(postId)},
        });
      },
    });

    t.field('createDraft', {
      type: 'Post',
      args: {
        title: stringArg(),
        content: stringArg(),
        authorEmail: stringArg(),
      },
      resolve: (_, {title, content, authorEmail}, ctx) => {
        return prisma.post.create({
          data: {
            title,
            content,
            published: false,
            author: {
              connect: {email: authorEmail},
            },
          },
        });
      },
    });

    t.field('publish', {
      type: 'Post',
      args: {
        postId: stringArg(),
      },
      resolve: (_, {postId}, ctx) => {
        return prisma.post.update({
          where: {id: Number(postId)},
          data: {published: true},
        });
      },
    });
  },
});

export const schema = makeSchema({
  types: [Query, Mutation, Post, User],
  outputs: {
    typegen: path.join(process.cwd(), 'pages', 'api', 'nexus-typegen.ts'),
    schema: path.join(process.cwd(), 'pages', 'api', 'schema.graphql'),
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default new ApolloServer({schema}).createHandler({
  path: '/api',
});
