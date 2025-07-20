import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from '../index.js';
import { users, institutes } from '@/shared/schema.js';
import { eq } from 'drizzle-orm';

// Configuración de Passport
export function setupPassport(passport: any) {
  // Serialización del usuario
  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  // Deserialización del usuario
  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user[0] || null);
    } catch (error) {
      done(error, null);
    }
  });

  // Estrategia Local (email/password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email: string, password: string, done: any) => {
        try {
          // Buscar usuario por email
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user[0]) {
            return done(null, false, { message: 'Email o contrasenya incorrectes' });
          }

          // Verificar si el usuario está activo
          if (!user[0].isActive) {
            return done(null, false, { message: 'El compte està desactivat' });
          }

          // Verificar contraseña
          if (user[0].passwordHash) {
            const isValidPassword = await bcrypt.compare(password, user[0].passwordHash);
            if (!isValidPassword) {
              return done(null, false, { message: 'Email o contrasenya incorrectes' });
            }
          } else {
            return done(null, false, { message: 'Aquest compte només permet accés amb Google' });
          }

          // Obtener información del instituto
          let institute = null;
          if (user[0].instituteId) {
            institute = await db
              .select()
              .from(institutes)
              .where(eq(institutes.id, user[0].instituteId))
              .limit(1);
          }

          const userWithInstitute = {
            ...user[0],
            institute: institute[0] || null,
          };

          return done(null, userWithInstitute);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Estrategia Google OAuth2
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const { id, displayName, emails, photos } = profile;
          const email = emails[0]?.value;

          if (!email) {
            return done(null, false, { message: 'No s\'ha pogut obtenir l\'email de Google' });
          }

          // Buscar usuario existente por Google ID o email
          let user = await db
            .select()
            .from(users)
            .where(eq(users.googleId, id))
            .limit(1);

          if (!user[0]) {
            // Buscar por email
            user = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
          }

          if (user[0]) {
            // Usuario existente - actualizar información de Google
            if (!user[0].googleId) {
              await db
                .update(users)
                .set({
                  googleId: id,
                  photoURL: photos[0]?.value,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user[0].id));
            }

            // Verificar si está activo
            if (!user[0].isActive) {
              return done(null, false, { message: 'El compte està desactivat' });
            }

            // Obtener información del instituto
            let institute = null;
            if (user[0].instituteId) {
              institute = await db
                .select()
                .from(institutes)
                .where(eq(institutes.id, user[0].instituteId))
                .limit(1);
            }

            const userWithInstitute = {
              ...user[0],
              institute: institute[0] || null,
            };

            return done(null, userWithInstitute);
          } else {
            // Nuevo usuario - crear cuenta
            // Para nuevos usuarios, requerimos que un admin los cree primero
            return done(null, false, {
              message: 'El compte no existeix. Contacta amb l\'administrador per crear-lo.',
            });
          }
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} 