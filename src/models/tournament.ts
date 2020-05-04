import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from './team';

@Entity({ name: 'tournaments' })
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  shortName: string;

  @Column({ type: 'smallint' })
  maxPlayers: number;

  @Column({ type: 'smallint' })
  playersPerTeam: number;

  @OneToMany(() => Team, (team) => team.tournament)
  teams: Team[];
}
